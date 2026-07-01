import mammoth from 'mammoth';
import { getSupabaseAdmin } from '../clients/supabase.server';

export interface W8BenValidationResult {
  isValid: boolean;
  confidenceScore: number;
  validationStatus: 'valid' | 'invalid' | 'needs_manual_review';
  reasons: string[];
  validationDetails: {
    isPdf: boolean;
    hasExpectedLayout: boolean;
    hasSignOffArea: boolean;
    hasContractorSignature: boolean;
    layoutNotes: string;
    signatureNotes: string;
  };
}

export async function validateW8BenFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  _userId?: string | null
): Promise<W8BenValidationResult> {
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
      console.warn('[w8benValidator] Mammoth text extraction failed:', err);
    }
  }

  // Fetch configs from DB with static fallbacks
  let activeRules = [
    { rule_name: 'IRS W-8BEN Layout & Header', rule_description: 'Verifies that structure matching the standard IRS Form W-8BEN is present', rule_type: 'layout', weight: 50 },
    { rule_name: 'Certification Block Presence', rule_description: 'Checks for Part III certification text blocks and sign-off guidelines', rule_type: 'signature', weight: 20 },
    { rule_name: 'Contractor Signature Check', rule_description: 'Detects the physical or digital signature of the beneficial owner in Part III', rule_type: 'signature', weight: 30 }
  ];

  let extractionFields = [
    { field_name: 'Beneficial Owner Name', field_description: 'First and last name of the beneficial owner', field_format: 'string', mapping_key: 'name', is_required: true },
    { field_name: 'Citizenship Country', field_description: 'Country of citizenship', field_format: 'string', mapping_key: 'citizenship', is_required: true },
    { field_name: 'Permanent Residence Address', field_description: 'Physical street address of residence', field_format: 'string', mapping_key: 'residenceAddress', is_required: true },
    { field_name: 'Typed Signature Name', field_description: 'Typed name of the signatory beneficial owner', field_format: 'string', mapping_key: 'signatureName', is_required: true }
  ];

  try {
    const supabase = getSupabaseAdmin();
    const { data: dbRules, error: rErr } = await supabase
      .from('admin_verification_rules')
      .select('*')
      .eq('document_type', 'w8ben')
      .eq('is_active', true);
    if (!rErr && dbRules && dbRules.length > 0) {
      activeRules = dbRules;
    }

    const { data: dbFields, error: fErr } = await supabase
      .from('admin_extraction_fields')
      .select('*')
      .eq('document_type', 'w8ben');
    if (!fErr && dbFields && dbFields.length > 0) {
      extractionFields = dbFields;
    }
  } catch (dbErr) {
    console.warn('[w8benValidator] Failed to load rules from DB, falling back to static config:', dbErr);
  }

  const getRuleJsonKey = (rule: any) => {
    return 'has_' + rule.rule_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
  };

  let contents: any[] = [];
  
  if (isPdf) {
    const base64Pdf = fileBuffer.toString('base64');
    contents.push({
      type: 'text',
      text: `Analyze the provided tax form document (passed as a base64 PDF in user content) and check if it is a valid, completed IRS Form W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting).

Check for these visual layout and content characteristics:
${activeRules.map(r => `- ${getRuleJsonKey(r)}: boolean. ${r.rule_description || r.rule_name} (Type: ${r.rule_type}).`).join('\n')}

Also extract these key fields:
${extractionFields.map(f => `- ${f.mapping_key}: ${f.field_description || f.field_name} (Format: ${f.field_format}).`).join('\n')}

Evaluate these details and return a JSON object with the following fields:
${activeRules.map(r => `"${getRuleJsonKey(r)}": boolean`).join(',\n')},
${extractionFields.map(f => `"${f.mapping_key}": any`).join(',\n')},
- layoutNotes: A short explanation (1-2 sentences) of layout and text matching findings.
- signatureNotes: A short description of the signature findings in Part III.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  ${activeRules.map(r => `"${getRuleJsonKey(r)}": boolean`).join(',\n  ')},
  ${extractionFields.map(f => `"${f.mapping_key}": any`).join(',\n  ')},
  "layoutNotes": "...",
  "signatureNotes": "..."
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
      text: `Below is the text content extracted from a tax form document:
---
${extractedText || 'No text extracted. Please inspect name: ' + fileName}
---
Check if this document matches the content of a valid IRS Form W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting).
Extract/check these details:
${activeRules.map(r => `- ${getRuleJsonKey(r)}: boolean. ${r.rule_description || r.rule_name} (Type: ${r.rule_type}).`).join('\n')}

Also extract these key fields:
${extractionFields.map(f => `- ${f.mapping_key}: ${f.field_description || f.field_name} (Format: ${f.field_format}).`).join('\n')}

Evaluate these details and return a JSON object with the following fields:
${activeRules.map(r => `"${getRuleJsonKey(r)}": boolean`).join(',\n')},
${extractionFields.map(f => `"${f.mapping_key}": any`).join(',\n')},
- layoutNotes: A short explanation of findings.
- signatureNotes: A short description of signature findings.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  ${activeRules.map(r => `"${getRuleJsonKey(r)}": boolean`).join(',\n  ')},
  ${extractionFields.map(f => `"${f.mapping_key}": any`).join(',\n  ')},
  "layoutNotes": "...",
  "signatureNotes": "..."
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
      throw new Error('Received empty response from validation model.');
    }

    const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, assistantMessage];
    const cleanedJson = (jsonMatch[1] || assistantMessage).trim();
    parsed = JSON.parse(cleanedJson);
  } catch (err) {
    console.error('[w8benValidator] Validation failed:', err);
    throw err instanceof Error ? err : new Error('Unexpected error occurred during W-8BEN validation.');
  }

  // 4. Validate findings & format checks
  const reasons: string[] = [];

  if (!isPdf) {
    reasons.push("Document is not in PDF format. W-8BEN tax forms must be uploaded as PDF files.");
  }

  // 5. Calculate Confidence Score based on dynamic rules & weights
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

  // 6. Write logs to audit tables in background
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('document_validation_findings').insert({
      contractor_user_id: _userId || 'unknown',
      document_type: 'w8ben',
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
      document_type: 'w8ben',
      pdf_url: null,
      extracted_json: extractedPayload
    });
  } catch (logErr) {
    console.warn('[w8benValidator] Failed to save dynamic audit log records:', logErr);
  }

  return {
    isValid: validationStatus === 'valid',
    confidenceScore,
    validationStatus,
    reasons,
    validationDetails: {
      isPdf,
      hasExpectedLayout: !!parsed[getRuleJsonKey(activeRules[0] || {})],
      hasSignOffArea: !!parsed[getRuleJsonKey(activeRules[1] || {})],
      hasContractorSignature: !!parsed[getRuleJsonKey(activeRules[2] || {})],
      layoutNotes: parsed.layoutNotes || '',
      signatureNotes: parsed.signatureNotes || ''
    }
  };
}
