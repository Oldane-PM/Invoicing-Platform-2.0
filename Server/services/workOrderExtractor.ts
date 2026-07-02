import mammoth from 'mammoth';
import { getSupabaseAdmin } from '../clients/supabase.server';

export interface ExtractedWorkOrderDetails {
  role: string | null;
  rate: number | null;
  rateType: 'hourly' | 'fixed' | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
}

export interface ExtractedInvoiceDetails {
  bankName: string | null;
  bankAddress: string | null;
  swiftCode: string | null;
  routingNumber: string | null;
  accountType: 'Checking' | 'Savings' | null;
  currency: string | null;
  accountNumber: string | null;
  invoiceNumber: string | null;
}

export interface ValidationDetails {
  isPdf: boolean;
  hasExpectedLayout: boolean;
  extractedWorkOrderId: string | null;
  hasSignOffArea: boolean;
  hasContractorSignature: boolean;
  hasFinanceSignature: boolean;
  validationCode: string | null;
  idExistsInDb: boolean | null;
  layoutNotes: string;
  signatureNotes: string;
}

export interface WorkOrderValidationResult {
  role: string | null;
  rate: number | null;
  rateType: 'hourly' | 'fixed' | null;
  startDate: string | null;
  endDate: string | null;

  isValid: boolean;
  confidenceScore: number;
  validationStatus: 'valid' | 'invalid' | 'needs_manual_review';
  reasons: string[];
  validationDetails: ValidationDetails;
  personalInfo?: any;
}

/**
 * Service to extract structured details and validate work order files using OpenRouter AI & Supabase DB.
 */
export async function extractDetailsFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  _userId?: string | null
): Promise<WorkOrderValidationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
  const extension = fileName.split('.').pop()?.toLowerCase();

  const isPdf = mimeType === 'application/pdf' || extension === 'pdf';
  
  let extractedText = '';
  let isImage = false;
  let isPdfType = false;

  // 1. Extract content based on file type
  if (
    mimeType.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '')
  ) {
    isImage = true;
  } else if (
    mimeType === 'application/pdf' ||
    extension === 'pdf'
  ) {
    isPdfType = true;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    try {
      const parsedDocx = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = parsedDocx.value || '';
    } catch (err) {
      console.error('[workOrderExtractor] DOCX parsing failed:', err);
      throw new Error('Failed to parse text from Word (.docx) file.');
    }
  } else {
    // Try standard text decoding as a fallback
    extractedText = fileBuffer.toString('utf8');
  }

  // 2. Fetch configurations from Database (with static fallbacks)
  let activeRules = [
    { rule_name: 'Intellibus Branding & Layout', rule_description: 'Verify presence of Intellibus header logos, document headers, and section structure', rule_type: 'layout', weight: 50 },
    { rule_name: 'Part III Sign-off & Certification', rule_description: 'Checks if the document contains sign-off certification blocks and representative name fields', rule_type: 'signature', weight: 20 },
    { rule_name: 'Contractor Signature Presence', rule_description: 'Detects whether the contractor or resource signature is present in the signature block', rule_type: 'signature', weight: 30 }
  ];

  let extractionFields = [
    { field_name: 'Role Name', field_format: 'string', mapping_key: 'role', is_required: true, field_description: 'Contractor role title assigned in the contract' },
    { field_name: 'Billing Rate', field_format: 'number', mapping_key: 'rate', is_required: true, field_description: 'Hourly or flat rate of compensation' },
    { field_name: 'Rate Type', field_format: 'string', mapping_key: 'rateType', is_required: true, field_description: 'Whether compensation is hourly, weekly, monthly, etc.' },
    { field_name: 'Start Date', field_format: 'date', mapping_key: 'startDate', is_required: true, field_description: 'Start date of the work order' },
    { field_name: 'End Date', field_format: 'date', mapping_key: 'endDate', is_required: true, field_description: 'Expiry or end date of the work order' }
  ];

  try {
    const supabase = getSupabaseAdmin();
    const { data: dbRules, error: rErr } = await supabase
      .from('admin_verification_rules')
      .select('*')
      .eq('document_type', 'work_order')
      .eq('is_active', true);
    if (!rErr && dbRules && dbRules.length > 0) {
      activeRules = dbRules;
    }

    const { data: dbFields, error: fErr } = await supabase
      .from('admin_extraction_fields')
      .select('*')
      .eq('document_type', 'work_order');
    if (!fErr && dbFields && dbFields.length > 0) {
      extractionFields = dbFields;
    }
  } catch (dbErr) {
    console.warn('[workOrderExtractor] Failed to load rules from DB, falling back to static config:', dbErr);
  }

  // Generate helper to get camelcase key for the prompt schema
  const getRuleJsonKey = (rule: any) => {
    return 'has_' + rule.rule_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
  };

  // 3. Prepare payload for OpenRouter
  const systemPrompt = `You are a precise data extraction and document validation agent. Analyze the provided work order document and perform the following tasks:

1. Extract contract fields:
${extractionFields.map(f => `   - ${f.mapping_key}: ${f.field_description || f.field_name} (Format: ${f.field_format}, Required: ${f.is_required}).`).join('\n')}

2. Perform layout & validity checks based on these verification rules:
${activeRules.map(r => `   - ${getRuleJsonKey(r)}: boolean. ${r.rule_description || r.rule_name} (Type: ${r.rule_type}).`).join('\n')}

3. Extra metadata extraction:
   - extractedWorkOrderId: any Work Order number or ID extracted (e.g. "1"). Use null if not found.
   - validationCode: any Transaction ID, validation code, or secure identifier. Use null if not found.
   - layoutNotes: A short explanation (1-2 sentences) of layout findings.
   - signatureNotes: A short description of the signature findings.

4. Extract contractor's personal details if present in the document:
   - fullName: Full name of the contractor / resource (string, null if not found)
   - email: Email address of the contractor (string, null if not found)
   - phone: Phone number of the contractor (string, null if not found)
   - addressLine1: Street address (string, null if not found)
   - addressLine2: Apartment, suite, unit (string, null if not found)
   - stateParish: State, parish, province, or region (string, null if not found)
   - country: Country (string, null if not found)
   - postalCode: Zip code or postal code (string, null if not found)

Return ONLY a JSON object with this structure:
{
  ${extractionFields.map(f => `"${f.mapping_key}": any`).join(',\n  ')},
  ${activeRules.map(r => `"${getRuleJsonKey(r)}": boolean`).join(',\n  ')},
  "extractedWorkOrderId": string | null,
  "validationCode": string | null,
  "layoutNotes": string,
  "signatureNotes": string,
  "personalInfo": {
    "fullName": string | null,
    "email": string | null,
    "phone": string | null,
    "addressLine1": string | null,
    "addressLine2": string | null,
    "stateParish": string | null,
    "country": string | null,
    "postalCode": string | null
  }
}
Do not write any markdown code block backticks, explanations, or extra text. Return only the raw JSON.`;

  let messages: any[] = [];

  if (isImage || isPdfType) {
    // Send images and PDFs directly as base64 to the vision model
    const base64Data = fileBuffer.toString('base64');
    const mediaType = isPdfType ? 'application/pdf' : (mimeType || 'image/jpeg');
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    console.log(`[workOrderExtractor] Sending ${isPdfType ? 'PDF' : 'image'} as base64 to vision model (${(base64Data.length / 1024).toFixed(0)}KB)`);
    messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: systemPrompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ];
  } else {
    if (!extractedText.trim()) {
      throw new Error(
        'The document contains no readable text. If this is a scanned PDF, please upload it as an image file (PNG/JPG).'
      );
    }
    messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Here is the text extracted from the work order document:\n\n${extractedText.substring(0, 40000)}`,
      },
    ];
  }

  // 4. Make OpenRouter API request
  let parsed: any;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://invoicing-platform-2-0.vercel.app',
        'X-Title': 'Work Order Data Extractor',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[workOrderExtractor] OpenRouter API error:', errText);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const responseData: any = await response.json();
    const assistantMessage = responseData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Received empty response from extraction model.');
    }

    try {
      const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, assistantMessage];
      const cleanedJson = (jsonMatch[1] || assistantMessage).trim();
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('[workOrderExtractor] JSON parsing failed for assistant message:', assistantMessage, parseErr);
      throw new Error('Failed to parse extraction model response as JSON.');
    }
  } catch (err) {
    console.error('[workOrderExtractor] Request failed:', err);
    throw err instanceof Error ? err : new Error('Unexpected error occurred during extraction.');
  }

  // 5. Validate findings & format checks
  const reasons: string[] = [];

  if (!isPdf) {
    reasons.push("Document is not in PDF format. Legitimate work orders must be uploaded as PDF files.");
  }

  // 6. Calculate Confidence Score based on dynamic rules & weights
  let confidenceScore = 0;
  let totalWeight = 0;

  for (const rule of activeRules) {
    const jsonKey = getRuleJsonKey(rule);
    const passed = !!parsed[jsonKey];
    totalWeight += rule.weight;
    if (passed) {
      confidenceScore += rule.weight;
    } else {
      reasons.push(`${rule.rule_name} check failed: ${rule.rule_description || 'Check not satisfied'}.`);
    }
  }

  if (totalWeight > 0) {
    confidenceScore = Math.round((confidenceScore / totalWeight) * 100);
  } else {
    confidenceScore = 100;
  }

  // Determine overall validity & status
  let validationStatus: 'valid' | 'invalid' | 'needs_manual_review' = 'needs_manual_review';
  if (!isPdf) {
    validationStatus = 'invalid';
  } else if (confidenceScore >= 80) {
    validationStatus = 'valid';
  } else if (confidenceScore < 50) {
    validationStatus = 'invalid';
  }

  const isValid = validationStatus === 'valid';

  // 7. Write logs to audit tables in background
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('document_validation_findings').insert({
      contractor_user_id: _userId || 'unknown',
      document_type: 'work_order',
      pdf_url: null,
      findings_json: parsed,
      confidence_score: confidenceScore,
      validation_status: validationStatus,
      reasons: reasons
    });

    const extractedPayload: any = {};
    extractionFields.forEach(f => {
      extractedPayload[f.mapping_key] = parsed[f.mapping_key] || null;
    });

    await supabase.from('document_extracted_data').insert({
      contractor_user_id: _userId || 'unknown',
      document_type: 'work_order',
      pdf_url: null,
      extracted_json: extractedPayload
    });

    // Auto-populate contractor profile with extracted personal details
    if (_userId && _userId !== 'unknown' && parsed.personalInfo) {
      const pInfo = parsed.personalInfo;
      const patch: any = {};
      if (pInfo.fullName) patch.full_name = pInfo.fullName;
      if (pInfo.email) patch.email = pInfo.email;
      if (pInfo.phone) patch.phone = pInfo.phone;
      if (pInfo.addressLine1) patch.address_line1 = pInfo.addressLine1;
      if (pInfo.addressLine2) patch.address_line2 = pInfo.addressLine2;
      if (pInfo.stateParish) patch.state_parish = pInfo.stateParish;
      if (pInfo.country) patch.country = pInfo.country;
      if (pInfo.postalCode) patch.postal_code = pInfo.postalCode;

      if (Object.keys(patch).length > 0) {
        console.log(`[workOrderExtractor] Auto-populating profile from work order for contractor: ${_userId}`, patch);
        await supabase.from('contractor_profiles').upsert({
          user_id: _userId,
          ...patch,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }
    }
  } catch (logErr) {
    console.warn('[workOrderExtractor] Failed to save dynamic audit log records:', logErr);
  }

  let normalizedRateType: 'hourly' | 'fixed' | null = null;
  if (parsed.rateType) {
    const raw = String(parsed.rateType).toLowerCase();
    if (raw.includes('hour') || raw.includes('hr')) {
      normalizedRateType = 'hourly';
    } else if (raw.includes('fixed') || raw.includes('month') || raw.includes('flat') || raw.includes('salary')) {
      normalizedRateType = 'fixed';
    }
  }

  return {
    // Flat fields (Backward compatibility for UI forms)
    role: parsed.role || null,
    rate: typeof parsed.rate === 'number' ? parsed.rate : null,
    rateType: normalizedRateType,
    startDate: parsed.startDate || null,
    endDate: parsed.endDate || null,
    personalInfo: parsed.personalInfo || null,

    // Validation details
    isValid,
    confidenceScore,
    validationStatus,
    reasons,
    validationDetails: {
      isPdf,
      hasExpectedLayout: !!parsed[getRuleJsonKey(activeRules[0] || {})],
      extractedWorkOrderId: parsed.extractedWorkOrderId || null,
      hasSignOffArea: !!parsed[getRuleJsonKey(activeRules[1] || {})],
      hasContractorSignature: !!parsed[getRuleJsonKey(activeRules[2] || {})],
      hasFinanceSignature: !!parsed[getRuleJsonKey(activeRules[2] || {})],
      validationCode: parsed.validationCode || null,
      idExistsInDb: null,
      layoutNotes: parsed.layoutNotes || '',
      signatureNotes: parsed.signatureNotes || ''
    }
  };
}

export async function extractInvoiceDetailsFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedInvoiceDetails> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  let extractedText = '';

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;
    } catch (err) {
      console.warn('[workOrderExtractor] Mammoth text extraction failed, falling back to base64:', err);
    }
  }

  let contents: any[] = [];
  
  if (isPdf) {
    const base64Pdf = fileBuffer.toString('base64');
    contents.push({
      type: 'text',
      text: `Analyze the provided invoice document (passed as a base64 PDF in user content). 
Identify the contractor's banking details and the invoice number. 
Extract the following information:
1. Bank Name: Name of the bank (e.g. Chase, Bank of America, NCBFG, etc.) where payouts should go.
2. Bank Address: Full bank address (if listed).
3. SWIFT Code: SWIFT or BIC identifier.
4. ABA/Wire Routing Number: The transit, routing, sort, or ABA number.
5. Account Type: Must be 'Checking' or 'Savings' if explicitly stated, otherwise null.
6. Currency: The currency of the bank account / invoice (e.g. USD, EUR, GBP, CAD, JMD). Must be a 3-letter currency code.
7. Account Number: Account number or IBAN.
8. Invoice Number: The invoice number identifier (e.g., INV-0042, 1024, etc.) found on the document.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  "bankName": "...",
  "bankAddress": "...",
  "swiftCode": "...",
  "routingNumber": "...",
  "accountType": "Checking" | "Savings" | null,
  "currency": "...",
  "accountNumber": "...",
  "invoiceNumber": "..."
}
\`\`\`
Return only the JSON block without extra explanations.`
    });
    contents.push({
      type: 'image_url',
      image_url: {
        url: `data:application/pdf;base64,${base64Pdf}`
      }
    });
  } else {
    contents.push({
      type: 'text',
      text: `Below is the text content extracted from an invoice document:
---
${extractedText || 'No text extracted. Please inspect name: ' + fileName}
---
Identify the contractor's banking details and the invoice number.
Extract the following information:
1. Bank Name: Name of the bank where payouts should go.
2. Bank Address: Full bank address (if listed).
3. SWIFT Code: SWIFT or BIC identifier.
4. ABA/Wire Routing Number: The transit, routing, sort, or ABA number.
5. Account Type: Must be 'Checking' or 'Savings' if explicitly stated, otherwise null.
6. Currency: The currency of the bank account / invoice (e.g. USD, EUR, GBP, CAD, JMD). Must be a 3-letter currency code.
7. Account Number: Account number or IBAN.
8. Invoice Number: The invoice number identifier (e.g., INV-0042, 1024, etc.) found on the document.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  "bankName": "...",
  "bankAddress": "...",
  "swiftCode": "...",
  "routingNumber": "...",
  "accountType": "Checking" | "Savings" | null,
  "currency": "...",
  "accountNumber": "...",
  "invoiceNumber": "..."
}
\`\`\`
Return only the JSON block without extra explanations.`
    });
  }

  let parsed: any;
  try {
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Oldane-PM/Invoicing-Platform-2.0',
        'X-Title': 'Invoicing Platform 2.0'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: contents
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const responseData: any = await response.json();
    const assistantMessage = responseData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Received empty response from extraction model.');
    }

    const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, assistantMessage];
    const cleanedJson = (jsonMatch[1] || assistantMessage).trim();
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    console.error('[workOrderExtractor] Invoice extraction failed:', err);
    throw err instanceof Error ? err : new Error('Unexpected error occurred during invoice extraction.');
  }

  return {
    bankName: parsed.bankName || null,
    bankAddress: parsed.bankAddress || null,
    swiftCode: parsed.swiftCode || null,
    routingNumber: parsed.routingNumber || null,
    accountType: (parsed.accountType === 'Checking' || parsed.accountType === 'Savings') ? parsed.accountType : null,
    currency: parsed.currency || null,
    accountNumber: parsed.accountNumber || null,
    invoiceNumber: parsed.invoiceNumber || null
  };
}
