import mammoth from 'mammoth';

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

  // 2. Prepare payload for OpenRouter
  const systemPrompt = `You are a precise data extraction and document validation agent. Analyze the provided work order document and perform the following tasks:

1. Extract contract fields:
   - role: The job title or position (e.g., "Software Engineer", "Consultant", "QA Engineer").
   - rate: The contract billing rate as a numeric value. If it says "$500/month", the rate is 500. Use null if not specified.
   - rateType: How the rate is charged. Must be exactly "hourly" or "fixed". If it mentions "per hour" or "hourly", use "hourly". If "monthly" or "fixed", use "fixed".
   - startDate: The contract start date in ISO format (YYYY-MM-DD). Use null if not found.
   - endDate: The contract end or expiry date in ISO format (YYYY-MM-DD). Use null if not found.

2. Perform layout & validity checks (specifically checking if it matches the standard Intellibus Work Order template characteristics):
   - hasExpectedLayout: true if the document branding/text contains "Intellibus" and "Work Order" or "EXHIBIT A".
   - extractedWorkOrderId: any Work Order number or ID extracted (e.g. "1").
   - hasSignOffArea: true if the document has signature lines or fields at the end.
   - hasContractorSignature: true if contractor signature details are present (e.g. contains signer name/date, typings like "V.McDove").
   - hasFinanceSignature: true if finance/authorized signature details are present (e.g. "Shailaja S" or "Head of HR & Finance").
   - validationCode: any Transaction ID, validation code, or secure identifier (e.g., look for "Transaction ID: [code]").

Return ONLY a JSON object with this structure:
{
  "role": string | null,
  "rate": number | null,
  "rateType": "hourly" | "fixed" | null,
  "startDate": "YYYY-MM-DD" | null,
  "endDate": "YYYY-MM-DD" | null,
  "hasExpectedLayout": boolean,
  "extractedWorkOrderId": string | null,
  "hasSignOffArea": boolean,
  "hasContractorSignature": boolean,
  "hasFinanceSignature": boolean,
  "validationCode": string | null,
  "layoutNotes": string,
  "signatureNotes": string
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

  // 3. Make OpenRouter API request
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

  // 4. Validate findings & format checks
  const reasons: string[] = [];

  if (!isPdf) {
    reasons.push("Document is not in PDF format. Legitimate work orders must be uploaded as PDF files.");
  }

  // 5. Calculate Confidence Score based on document format
  let confidenceScore = 0;
  if (parsed.hasExpectedLayout) {
    confidenceScore += 50;
  } else {
    reasons.push("Document branding and section layout do not match the expected Intellibus Work Order template.");
  }

  if (parsed.hasSignOffArea) {
    confidenceScore += 20;
  } else {
    reasons.push("The document is missing the required sign-off area.");
  }

  if (parsed.hasContractorSignature) {
    confidenceScore += 15;
  } else {
    reasons.push("Contractor signature is missing or was not detected.");
  }

  if (parsed.hasFinanceSignature) {
    confidenceScore += 15;
  } else {
    reasons.push("Finance officer authorization signature is missing or was not detected.");
  }

  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  // Determine overall validity & status purely based on format/signatures
  let validationStatus: 'valid' | 'invalid' | 'needs_manual_review' = 'needs_manual_review';
  if (!isPdf) {
    validationStatus = 'invalid';
  } else if (!parsed.hasExpectedLayout) {
    validationStatus = 'invalid';
  } else if (confidenceScore >= 80) { // e.g. layout (50) + sign-off (20) + contractor signature (15) = 85 (Valid)
    validationStatus = 'valid';
  } else if (confidenceScore < 50) {
    validationStatus = 'invalid';
  }

  const isValid = validationStatus === 'valid';

  return {
    // Flat fields (Backward compatibility for UI forms)
    role: parsed.role || null,
    rate: typeof parsed.rate === 'number' ? parsed.rate : null,
    rateType: ['hourly', 'fixed'].includes(parsed.rateType) ? parsed.rateType : null,
    startDate: parsed.startDate || null,
    endDate: parsed.endDate || null,

    // Validation details
    isValid,
    confidenceScore,
    validationStatus,
    reasons,
    validationDetails: {
      isPdf,
      hasExpectedLayout: !!parsed.hasExpectedLayout,
      extractedWorkOrderId: parsed.extractedWorkOrderId || null,
      hasSignOffArea: !!parsed.hasSignOffArea,
      hasContractorSignature: !!parsed.hasContractorSignature,
      hasFinanceSignature: !!parsed.hasFinanceSignature,
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
