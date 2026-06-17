import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

export interface W8BenData {
  // Part I
  name: string;
  citizenship: string;
  residenceAddress: string;
  residenceCity: string;
  residenceCountry: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingCountry?: string;
  usTaxId?: string;
  foreignTaxId?: string;
  ftin_not_required?: boolean;
  referenceNumber?: string;
  dob?: string;

  // Part II
  treatyCountry?: string;
  specialRatesArticle?: string;
  specialRatesPercent?: string;
  specialRatesIncomeType?: string;
  specialRatesConditions?: string;

  // Signature Data
  signatureName: string;
  signatureDate: Date;
  ipAddress?: string;
}

// Layout constants
const LEFT = 36;
const PAGE_WIDTH = 612; // US Letter
const PAGE_HEIGHT = 792;
const RIGHT = PAGE_WIDTH - LEFT;
const CONTENT_WIDTH = RIGHT - LEFT;
const MID = LEFT + CONTENT_WIDTH / 2;

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
};

const COLORS = {
  black: '#000000',
  irsBlue: '#1a2e5a',     // Dark navy for part headers
  irsBlueBg: '#d4dff0',   // Light blue background for part headers
  fieldBg: '#eef3fb',     // Very light blue for field rows (like official form)
  white: '#ffffff',
  gray: '#555555',
  signatureBlue: '#1a4fa0',
};

export async function generateW8BenPdf(data: W8BenData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 28, bottom: 28, left: LEFT, right: LEFT },
        info: {
          Title: `Form W-8BEN - ${data.name}`,
          Author: 'Invoicing Platform',
          Subject: 'Certificate of Foreign Status of Beneficial Owner',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawFormHeader(doc);
      drawDoNotUseSection(doc);
      drawNote(doc);
      drawPart1(doc, data);
      drawPart2(doc, data);
      drawPart3(doc, data);
      drawFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ─── Utility helpers ───────────────────────────────────────────────

function hline(doc: PDFKit.PDFDocument, y: number, x1 = LEFT, x2 = RIGHT) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.5).strokeColor(COLORS.black).stroke();
}

function partHeader(doc: PDFKit.PDFDocument, label: string, y: number): number {
  const h = 16;
  // Dark blue tab for "Part I" / "Part II" / "Part III"
  const tabWidth = 46;
  doc.rect(LEFT, y, tabWidth, h).fillAndStroke(COLORS.irsBlue, COLORS.irsBlue);
  doc.fillColor(COLORS.white).font(FONTS.bold).fontSize(8);
  const partLabel = label.split(/\s+/).slice(0, 2).join(' '); // "Part I", "Part II", etc.
  doc.text(partLabel, LEFT + 3, y + 4, { width: tabWidth - 6 });

  // Light blue bar for the rest of the description
  const descText = label.replace(/^Part\s+\S+\s+/, '');
  doc.rect(LEFT + tabWidth, y, CONTENT_WIDTH - tabWidth, h).fillAndStroke(COLORS.irsBlueBg, COLORS.irsBlue);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(8);
  doc.text(descText, LEFT + tabWidth + 6, y + 4, { width: CONTENT_WIDTH - tabWidth - 12 });

  return y + h;
}

// ─── Header ────────────────────────────────────────────────────────

function drawFormHeader(doc: PDFKit.PDFDocument) {
  const y = 28;

  // Left column - Form number
  doc.font(FONTS.regular).fontSize(7).fillColor(COLORS.black).text('Form', LEFT, y);
  doc.font(FONTS.bold).fontSize(22).text('W-8BEN', LEFT, y + 7);
  doc.font(FONTS.regular).fontSize(7).text('(Rev. October 2021)', LEFT, y + 30);

  // Vertical separator
  const sepX = LEFT + 102;
  doc.moveTo(sepX, y).lineTo(sepX, y + 52).lineWidth(0.5).stroke();

  // Center column - Title
  const centerX = sepX + 8;
  const centerW = 340;
  doc.font(FONTS.bold).fontSize(10.5)
    .text('Certificate of Foreign Status of Beneficial Owner for United', centerX, y, { width: centerW, align: 'center' });
  doc.text('States Tax Withholding and Reporting (Individuals)', centerX, y + 13, { width: centerW, align: 'center' });

  doc.font(FONTS.regular).fontSize(7);
  doc.text('▶ For use by individuals. Entities must use Form W-8BEN-E.', centerX, y + 28, { width: centerW, align: 'center' });
  doc.text('▶ Go to www.irs.gov/FormW8BEN for instructions and the latest information.', centerX, y + 37, { width: centerW, align: 'center' });
  doc.text('▶ Give this form to the withholding agent or payer. Do not send to the IRS.', centerX, y + 46, { width: centerW, align: 'center' });

  // Right column - OMB
  const ombX = RIGHT - 100;
  doc.font(FONTS.regular).fontSize(7).text('OMB No. 1545-1621', ombX, y, { width: 100, align: 'right' });

  // Bottom border
  hline(doc, y + 55);
  doc.y = y + 58;
}

// ─── "Do NOT use this form if:" ────────────────────────────────────

function drawDoNotUseSection(doc: PDFKit.PDFDocument) {
  let y = doc.y;

  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.black);
  doc.text('Do NOT use this form if:', LEFT, y, { continued: true });
  doc.text('Instead, use Form:', RIGHT - 120, y, { width: 120, align: 'right' });
  y += 11;

  const items = [
    ['You are NOT an individual', 'W-8BEN-E'],
    ['You are a U.S. citizen or other U.S. person, including a resident alien individual', 'W-9'],
    ['You are a beneficial owner claiming that income is effectively connected with the conduct of trade or business within the United States (other than personal services)', 'W-8ECI'],
    ['You are a beneficial owner who is receiving compensation for personal services performed in the United States', '8233 or W-4'],
    ['You are a person acting as an intermediary', 'W-8IMY'],
  ];

  doc.font(FONTS.regular).fontSize(6.5);
  for (const [desc, form] of items) {
    doc.text(`• ${desc}`, LEFT, y, { width: CONTENT_WIDTH - 80 });
    const lineH = doc.heightOfString(`• ${desc}`, { width: CONTENT_WIDTH - 80 });
    doc.font(FONTS.bold).text(form, RIGHT - 75, y, { width: 75, align: 'right' });
    doc.font(FONTS.regular);
    y += Math.max(lineH, 9) + 1;
  }

  hline(doc, y + 2);
  doc.y = y + 4;
}

// ─── Note ──────────────────────────────────────────────────────────

function drawNote(doc: PDFKit.PDFDocument) {
  let y = doc.y;
  doc.font(FONTS.bold).fontSize(6.5).text('Note: ', LEFT, y, { continued: true });
  doc.font(FONTS.regular).text(
    'If you are resident in a FATCA partner jurisdiction (that is, a Model 1 IGA jurisdiction with reciprocity), certain tax account information may be provided to your jurisdiction of residence.',
    { width: CONTENT_WIDTH - 30 }
  );
  y = doc.y + 4;
  hline(doc, y);
  doc.y = y + 2;
}

// ─── Part I ────────────────────────────────────────────────────────

function drawPart1(doc: PDFKit.PDFDocument, data: W8BenData) {
  let y = doc.y;
  y = partHeader(doc, 'Part I Identification of Beneficial Owner (see instructions)', y);

  // Row: Line 1 & 2
  doc.rect(LEFT, y, CONTENT_WIDTH, 30).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('1', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text('Name of individual who is the beneficial owner', LEFT + 14, y + 2, { width: MID - LEFT - 20 });
  doc.font(FONTS.regular).fontSize(9).text(data.name, LEFT + 14, y + 14, { width: MID - LEFT - 20 });

  // Vertical divider at mid
  doc.moveTo(MID, y).lineTo(MID, y + 30).lineWidth(0.5).stroke();

  doc.font(FONTS.bold).fontSize(7);
  doc.text('2', MID + 3, y + 2);
  doc.font(FONTS.regular).text('Country of citizenship', MID + 14, y + 2);
  doc.fontSize(9).text(data.citizenship, MID + 14, y + 14);
  y += 30;

  // Row: Line 3
  doc.rect(LEFT, y, CONTENT_WIDTH, 38).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('3', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text(
    'Permanent residence address (street, apt. or suite no., or rural route). Do not use a P.O. box or in-care-of address.',
    LEFT + 14, y + 2, { width: CONTENT_WIDTH - 20 }
  );
  doc.fontSize(9).text(data.residenceAddress, LEFT + 14, y + 12);

  // Sub-row: City / Country
  const subY = y + 22;
  hline(doc, subY, LEFT, RIGHT);
  doc.font(FONTS.regular).fontSize(6.5);
  doc.text('City or town, state or province. Include postal code where appropriate.', LEFT + 14, subY + 2, { width: MID + 60 - LEFT });
  doc.fontSize(9).text(data.residenceCity, LEFT + 14, subY + 10);
  doc.moveTo(MID + 80, subY).lineTo(MID + 80, y + 38).lineWidth(0.5).stroke();
  doc.font(FONTS.regular).fontSize(6.5).text('Country', MID + 84, subY + 2);
  doc.fontSize(9).text(data.residenceCountry, MID + 84, subY + 10);
  y += 38;

  // Row: Line 4
  doc.rect(LEFT, y, CONTENT_WIDTH, 38).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('4', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text('Mailing address (if different from above)', LEFT + 14, y + 2);
  if (data.mailingAddress) {
    doc.fontSize(9).text(data.mailingAddress, LEFT + 14, y + 12);
  } else {
    doc.font(FONTS.italic).fontSize(8).text('Same as residence address', LEFT + 14, y + 12);
  }
  const subY4 = y + 22;
  hline(doc, subY4, LEFT, RIGHT);
  doc.font(FONTS.regular).fontSize(6.5);
  doc.text('City or town, state or province. Include postal code where appropriate.', LEFT + 14, subY4 + 2, { width: MID + 60 - LEFT });
  if (data.mailingCity) doc.fontSize(9).text(data.mailingCity, LEFT + 14, subY4 + 10);
  doc.moveTo(MID + 80, subY4).lineTo(MID + 80, y + 38).lineWidth(0.5).stroke();
  doc.font(FONTS.regular).fontSize(6.5).text('Country', MID + 84, subY4 + 2);
  if (data.mailingCountry) doc.fontSize(9).text(data.mailingCountry, MID + 84, subY4 + 10);
  y += 38;

  // Row: Line 5
  doc.rect(LEFT, y, CONTENT_WIDTH, 24).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('5', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text('U.S. taxpayer identification number (SSN or ITIN), if required (see instructions)', LEFT + 14, y + 2, { width: CONTENT_WIDTH - 20 });
  doc.fontSize(9).text(data.usTaxId || 'N/A', LEFT + 14, y + 13);
  y += 24;

  // Row: Line 6a & 6b
  doc.rect(LEFT, y, CONTENT_WIDTH, 24).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('6a', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text('Foreign tax identifying number (see instructions)', LEFT + 18, y + 2);
  doc.fontSize(9).text(data.foreignTaxId || 'N/A', LEFT + 18, y + 13);

  doc.moveTo(MID, y).lineTo(MID, y + 24).lineWidth(0.5).stroke();
  doc.font(FONTS.bold).fontSize(7).text('6b', MID + 3, y + 2);
  doc.font(FONTS.regular).text('Check if FTIN not legally required', MID + 18, y + 2);
  // Checkbox
  doc.rect(MID + CONTENT_WIDTH / 2 - 30, y + 8, 10, 10).stroke();
  if (data.ftin_not_required) {
    doc.font(FONTS.bold).fontSize(9).text('✓', MID + CONTENT_WIDTH / 2 - 28, y + 9);
  }
  y += 24;

  // Row: Line 7 & 8
  doc.rect(LEFT, y, CONTENT_WIDTH, 24).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('7', LEFT + 3, y + 2);
  doc.font(FONTS.regular).text('Reference number(s) (see instructions)', LEFT + 14, y + 2);
  doc.fontSize(9).text(data.referenceNumber || 'N/A', LEFT + 14, y + 13);

  doc.moveTo(MID, y).lineTo(MID, y + 24).lineWidth(0.5).stroke();
  doc.font(FONTS.bold).fontSize(7).text('8', MID + 3, y + 2);
  doc.font(FONTS.regular).text('Date of birth (MM-DD-YYYY) (see instructions)', MID + 14, y + 2);
  doc.fontSize(9).text(data.dob || 'N/A', MID + 14, y + 13);
  y += 24;

  doc.y = y;
}

// ─── Part II ───────────────────────────────────────────────────────

function drawPart2(doc: PDFKit.PDFDocument, data: W8BenData) {
  let y = doc.y;
  y = partHeader(doc, 'Part II Claim of Tax Treaty Benefits (for chapter 3 purposes only) (see instructions)', y);

  // Line 9
  doc.rect(LEFT, y, CONTENT_WIDTH, 28).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('9', LEFT + 3, y + 3);
  doc.font(FONTS.regular).text('I certify that the beneficial owner is a resident of', LEFT + 14, y + 3, { continued: true });

  // Treaty country value (underlined)
  const countryVal = data.treatyCountry || 'N/A';
  doc.font(FONTS.bold).fontSize(9).text(`  ${countryVal}  `, { continued: true });
  doc.font(FONTS.regular).fontSize(7).text('within the meaning of the income tax');
  doc.text('treaty between the United States and that country.', LEFT + 14, y + 16);
  y += 28;

  // Line 10
  doc.rect(LEFT, y, CONTENT_WIDTH, 52).fillAndStroke(COLORS.fieldBg, COLORS.black);
  doc.fillColor(COLORS.black).font(FONTS.bold).fontSize(7);
  doc.text('10', LEFT + 3, y + 3);
  doc.font(FONTS.bold).text(
    'Special rates and conditions (if applicable—see instructions): The beneficial owner is claiming the provisions of Article and paragraph',
    LEFT + 18, y + 3, { width: CONTENT_WIDTH - 24 }
  );

  if (data.specialRatesArticle) {
    doc.font(FONTS.regular).fontSize(8);
    doc.text(
      `${data.specialRatesArticle} of the treaty identified on line 9 above to claim a ${data.specialRatesPercent || '___'}% rate of withholding on (specify type of income): ${data.specialRatesIncomeType || '___'}`,
      LEFT + 18, y + 20, { width: CONTENT_WIDTH - 24 }
    );
    doc.moveDown(0.3);
    doc.font(FONTS.regular).fontSize(7).text(
      `Explain the additional conditions in the Article and paragraph the beneficial owner meets to be eligible for the rate of withholding: ${data.specialRatesConditions || 'N/A'}`,
      LEFT + 18, undefined, { width: CONTENT_WIDTH - 24 }
    );
  } else {
    doc.font(FONTS.italic).fontSize(8).text('N/A', LEFT + 18, y + 22);
  }
  y += 52;

  doc.y = y;
}

// ─── Part III ──────────────────────────────────────────────────────

function drawPart3(doc: PDFKit.PDFDocument, data: W8BenData) {
  let y = doc.y;
  y = partHeader(doc, 'Part III Certification', y);

  // Certification text
  doc.fillColor(COLORS.black).font(FONTS.regular).fontSize(6.8);

  const certText =
    'Under penalties of perjury, I declare that I have examined the information on this form and to the best of my knowledge and belief it is true, correct, and complete. I further certify under penalties of perjury that:';

  doc.text(certText, LEFT, y + 4, { width: CONTENT_WIDTH });
  y = doc.y + 3;

  const bullets = [
    'I am the individual that is the beneficial owner (or am authorized to sign for the individual that is the beneficial owner) of all the income or proceeds to which this form relates or am using this form to document myself for chapter 4 purposes;',
    'The person named on line 1 of this form is not a U.S. person;',
    'This form relates to:\n  (a) income not effectively connected with the conduct of a trade or business in the United States;\n  (b) income effectively connected with the conduct of a trade or business in the United States but is not subject to tax under an applicable income tax treaty;\n  (c) the partner\'s share of a partnership\'s effectively connected taxable income; or\n  (d) the partner\'s amount realized from the transfer of a partnership interest subject to withholding under section 1446(f);',
    'The person named on line 1 of this form is a resident of the treaty country listed on line 9 of the form (if any) within the meaning of the income tax treaty between the United States and that country; and',
    'For broker transactions or barter exchanges, the beneficial owner is an exempt foreign person as defined in the instructions.',
  ];

  for (const bullet of bullets) {
    doc.text(`• ${bullet}`, LEFT + 4, y, { width: CONTENT_WIDTH - 8 });
    y = doc.y + 2;
  }

  y += 2;
  doc.font(FONTS.regular).fontSize(6.8);
  doc.text(
    'Furthermore, I authorize this form to be provided to any withholding agent that has control, receipt, or custody of the income of which I am the beneficial owner or any withholding agent that can disburse or make payments of the income of which I am the beneficial owner. ',
    LEFT, y, { width: CONTENT_WIDTH, continued: true }
  );
  doc.font(FONTS.bold).text(
    'I agree that I will submit a new form within 30 days if any certification made on this form becomes incorrect.',
    { width: CONTENT_WIDTH }
  );

  y = doc.y + 8;

  // Checkbox
  doc.rect(LEFT + 80, y, 9, 9).stroke();
  doc.font(FONTS.bold).fontSize(8).text('✓', LEFT + 82, y + 1);
  doc.font(FONTS.regular).fontSize(7).text(
    'I certify that I have the capacity to sign for the person identified on line 1 of this form.',
    LEFT + 95, y + 1
  );

  y += 18;
  hline(doc, y);

  // ── Signature block ──
  const sigBlockH = 52;
  doc.rect(LEFT, y, CONTENT_WIDTH, sigBlockH).stroke();

  // "Sign Here" label with arrow
  doc.save();
  doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.black);
  doc.text('Sign', LEFT + 4, y + 8);
  doc.text('Here', LEFT + 4, y + 20);
  // Arrow
  doc.font(FONTS.bold).fontSize(16).text('▶', LEFT + 6, y + 32);
  doc.restore();

  const sigLeft = LEFT + 40;
  const sigWidth = CONTENT_WIDTH * 0.6;
  const dateLeft = sigLeft + sigWidth + 10;
  const dateWidth = CONTENT_WIDTH - sigWidth - 54;

  // Vertical divider for date column
  doc.moveTo(dateLeft - 5, y).lineTo(dateLeft - 5, y + sigBlockH).lineWidth(0.5).stroke();

  // Signature value
  doc.font(FONTS.italic).fontSize(16).fillColor(COLORS.signatureBlue)
    .text(data.signatureName, sigLeft, y + 6, { width: sigWidth });

  // Signature label underline
  hline(doc, y + 28, sigLeft, sigLeft + sigWidth);
  doc.font(FONTS.regular).fontSize(6.5).fillColor(COLORS.black);
  doc.text('Signature of beneficial owner (or individual authorized to sign for beneficial owner)', sigLeft, y + 30, { width: sigWidth });

  // Date value
  doc.font(FONTS.regular).fontSize(9).fillColor(COLORS.black);
  doc.text(format(data.signatureDate, 'MM-dd-yyyy'), dateLeft, y + 10, { width: dateWidth });
  hline(doc, y + 28, dateLeft, RIGHT - 4);
  doc.font(FONTS.regular).fontSize(6.5).text('Date (MM-DD-YYYY)', dateLeft, y + 30, { width: dateWidth });

  // Print name row
  const printY = y + 40;
  hline(doc, printY, sigLeft, sigLeft + sigWidth);
  doc.font(FONTS.regular).fontSize(9).text(data.signatureName, sigLeft, printY + 2, { width: sigWidth });
  // No, let me put name above and label below
  // Actually the standard form has: line, then "Print name of signer" below
  // But value goes above the line. Let me adjust.
  // For simplicity: value above line, label below.

  y += sigBlockH + 4;

  // Digital audit trail (extra, not on official form but adds value)
  doc.font(FONTS.regular).fontSize(6).fillColor(COLORS.gray);
  doc.text(
    `Digitally signed: ${format(data.signatureDate, 'yyyy-MM-dd HH:mm:ss')} UTC` +
    (data.ipAddress ? ` | IP: ${data.ipAddress}` : ''),
    LEFT, y
  );

  doc.y = y + 12;
}

// ─── Footer ────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument) {
  const y = PAGE_HEIGHT - 36;
  hline(doc, y);
  doc.font(FONTS.bold).fontSize(7).fillColor(COLORS.black);
  doc.text('For Paperwork Reduction Act Notice, see separate instructions.', LEFT, y + 4);
  doc.font(FONTS.regular).text('Cat. No. 25047Z', LEFT + 220, y + 4);
  doc.font(FONTS.bold).text('Form W-8BEN (Rev. 10-2021)', RIGHT - 140, y + 4, { width: 140, align: 'right' });
}
