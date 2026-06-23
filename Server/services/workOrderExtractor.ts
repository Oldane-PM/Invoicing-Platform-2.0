import mammoth from 'mammoth';

export interface ExtractedWorkOrderDetails {
  role: string | null;
  rate: number | null;
  rateType: 'hourly' | 'fixed' | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
}

/**
 * Service to extract structured details from work order files using OpenRouter AI.
 */
export async function extractDetailsFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractedWorkOrderDetails> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
  const extension = fileName.split('.').pop()?.toLowerCase();

  let extractedText = '';
  let isImage = false;
  let isPdf = false;

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
    // PDFs are sent directly as base64 to the vision model for much better accuracy
    // than error-prone text extraction libraries
    isPdf = true;
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
  } else if (
    mimeType === 'application/msword' ||
    extension === 'doc'
  ) {
    // Basic doc file text parsing fallback or throw
    throw new Error('Legacy Word format (.doc) is not supported. Please convert to .docx or .pdf.');
  } else {
    // Try standard text decoding as a fallback
    extractedText = fileBuffer.toString('utf8');
  }

  // 2. Prepare payload for OpenRouter
  const systemPrompt = `You are a precise data extraction agent. Analyze the provided work order document and extract these exact contract fields:
1. role: The job title or position (e.g., "Software Engineer", "Consultant", "QA Engineer").
2. rate: The contract billing rate as a numeric value. If the document says "$15 (USD) / Hour", the rate is 15. If it says "$500/month", the rate is 500. Use null if not specified.
3. rateType: How the rate is charged. Must be exactly "hourly" or "fixed". If the document mentions "per hour", "/hour", or "hourly rate", use "hourly". If it mentions "monthly", "fixed", "salary", "per month", use "fixed". Default to "hourly" if unclear.
4. startDate: The contract start date in ISO format (YYYY-MM-DD). Parse dates carefully — "July 1, 2026" is "2026-07-01", "November 30, 2026" is "2026-11-30". Use null if not found.
5. endDate: The contract end or expiry date in ISO format (YYYY-MM-DD). Parse dates carefully. Use null if not found.

IMPORTANT: Read the document text very carefully. Do NOT guess or make up values. If the document says "Hourly Rate: $15 (USD) / Hour", then rate=15 and rateType="hourly". Pay close attention to month names when converting dates.

Return ONLY a JSON object with these exact keys:
{
  "role": string | null,
  "rate": number | null,
  "rateType": "hourly" | "fixed" | null,
  "startDate": "YYYY-MM-DD" | null,
  "endDate": "YYYY-MM-DD" | null
}
Do not write any markdown code block backticks (like \`\`\`json), explanations, or extra text. Return only the raw JSON.`;

  let messages: any[] = [];

  if (isImage || isPdf) {
    // Send images and PDFs directly as base64 to the vision model
    const base64Data = fileBuffer.toString('base64');
    const mediaType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg');
    const dataUrl = `data:${mediaType};base64,${base64Data}`;
    console.log(`[workOrderExtractor] Sending ${isPdf ? 'PDF' : 'image'} as base64 to vision model (${(base64Data.length / 1024).toFixed(0)}KB)`);
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
    console.log(`[workOrderExtractor] Extracted text (first 500 chars): ${extractedText.substring(0, 500)}`);
    messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Here is the text extracted from the work order document:\n\n${extractedText.substring(
          0,
          40000
        )}`, // Limit size safely
      },
    ];
  }

  // 3. Make OpenRouter API request
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

    // Parse structured JSON
    let parsed: any;
    try {
      const jsonMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, assistantMessage];
      const cleanedJson = (jsonMatch[1] || assistantMessage).trim();
      parsed = JSON.parse(cleanedJson);
    } catch (parseErr) {
      console.error('[workOrderExtractor] JSON parsing failed for assistant message:', assistantMessage, parseErr);
      throw new Error('Failed to parse extraction model response as JSON.');
    }

    return {
      role: parsed.role || null,
      rate: typeof parsed.rate === 'number' ? parsed.rate : null,
      rateType: ['hourly', 'fixed'].includes(parsed.rateType) ? parsed.rateType : null,
      startDate: parsed.startDate || null,
      endDate: parsed.endDate || null,
    };
  } catch (err) {
    console.error('[workOrderExtractor] Request failed:', err);
    throw err instanceof Error ? err : new Error('Unexpected error occurred during extraction.');
  }
}
