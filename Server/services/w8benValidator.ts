import mammoth from 'mammoth';

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
  fileName: string
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

  let contents: any[] = [];
  
  if (isPdf) {
    const base64Pdf = fileBuffer.toString('base64');
    contents.push({
      type: 'text',
      text: `Analyze the provided tax form document (passed as a base64 PDF in user content) and check if it is a valid, completed IRS Form W-8BEN (Certificate of Foreign Status of Beneficial Owner for United States Tax Withholding and Reporting).

Check for these visual layout and content characteristics:
1. Expected W-8BEN Layout:
   - Does it contain headers like "Form W-8BEN", "Department of the Treasury Internal Revenue Service", or "Certificate of Foreign Status of Beneficial Owner"?
   - Does it have Part I (Identification of Beneficial Owner), Part II (Claim of Tax Treaty Benefits), Part III (Certification)?
2. Sign-off / Certification Area:
   - Does Part III contain the required IRS certification paragraphs and a sign-off area?
3. Contractor Signature:
   - Is there a handwritten signature, digital signature (e.g. DocuSign, Adobe Sign), or signature stamp in the "Sign Here" section of Part III?
   - Is there a signature date next to the signature?

Evaluate these details and return a JSON object with the following fields:
- hasExpectedLayout: true if the layout structure, titles, and sections match the standard IRS Form W-8BEN, false otherwise.
- hasSignOffArea: true if the certification and sign-off area in Part III is present, false otherwise.
- hasContractorSignature: true if a signature (handwritten, stamp, or digital certificate) is visible/present in the signature area of Part III, false otherwise.
- layoutNotes: A short explanation (1-2 sentences) of layout and text matching findings.
- signatureNotes: A short description of the signature findings in Part III.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  "hasExpectedLayout": true | false,
  "hasSignOffArea": true | false,
  "hasContractorSignature": true | false,
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
1. Expected W-8BEN Layout: Check if titles like "Form W-8BEN", "Beneficial Owner", and "Certification" are present.
2. Sign-off / Certification Area: Check if Part III (Certification) text is present.
3. Contractor Signature: Check if there's a signature, signature text, or placeholder in Part III.

Evaluate these details and return a JSON object with the following fields:
- hasExpectedLayout: true if it matches a standard W-8BEN content structure, false otherwise.
- hasSignOffArea: true if the Part III certification block is present, false otherwise.
- hasContractorSignature: true if signature details are present, false otherwise.
- layoutNotes: A short explanation of findings.
- signatureNotes: A short description of signature findings.

Return the result STRICTLY as a JSON object inside a fenced markdown block:
\`\`\`json
{
  "hasExpectedLayout": true | false,
  "hasSignOffArea": true | false,
  "hasContractorSignature": true | false,
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

  // 5. Calculate Confidence Score based on document format
  let confidenceScore = 0;
  if (parsed.hasExpectedLayout) {
    confidenceScore += 50;
  } else {
    reasons.push("Document structure and section headers do not match a standard IRS Form W-8BEN.");
  }

  if (parsed.hasSignOffArea) {
    confidenceScore += 20;
  } else {
    reasons.push("The document is missing the required Part III Certification section.");
  }

  if (parsed.hasContractorSignature) {
    confidenceScore += 30;
  } else {
    reasons.push("Beneficial Owner (Contractor) signature is missing or was not detected in Part III.");
  }

  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  // Determine overall validity & status purely based on format/signatures
  let validationStatus: 'valid' | 'invalid' | 'needs_manual_review' = 'needs_manual_review';
  if (!isPdf) {
    validationStatus = 'invalid';
  } else if (!parsed.hasExpectedLayout) {
    validationStatus = 'invalid';
  } else if (confidenceScore >= 80) { // layout (50) + sign-off (20) + signature (30) = 100
    validationStatus = 'valid';
  } else if (confidenceScore < 50) {
    validationStatus = 'invalid';
  }

  return {
    isValid: validationStatus === 'valid',
    confidenceScore,
    validationStatus,
    reasons,
    validationDetails: {
      isPdf,
      hasExpectedLayout: !!parsed.hasExpectedLayout,
      hasSignOffArea: !!parsed.hasSignOffArea,
      hasContractorSignature: !!parsed.hasContractorSignature,
      layoutNotes: parsed.layoutNotes || '',
      signatureNotes: parsed.signatureNotes || ''
    }
  };
}
