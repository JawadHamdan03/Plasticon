import type { Request, Response } from "express";
import OpenAI from "openai";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

// ── Extraction prompt ─────────────────────────────────────────────────────────
// Two-stage approach: extract raw fields first, then verify math.
const EXTRACTION_PROMPT = `You are a highly accurate invoice data extraction engine.
The invoice may be in Arabic, Hebrew, English, or a mix. Read every character carefully.

━━━━━━━━━━━━━━━  MANDATORY RULES  ━━━━━━━━━━━━━━━

NUMERALS
• Convert ALL Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) → Western digits (0123456789).
• Convert ALL Eastern Arabic digits if present.
• Remove thousands separators (commas, dots used as thousands) before parsing.
• Use dot as decimal separator in output.
• Every numeric field MUST be a JSON number, NEVER a string.

CURRENCY
• ₪  / شيقل / ش.ج / ש"ח / NIS / ILS  →  "ILS"
• $  / USD / دولار                    →  "USD"
• €  / EUR / يورو                     →  "EUR"
• ر.س / SAR / ريال سعودي             →  "SAR"
• ج.م / EGP / جنيه                   →  "EGP"
• د.إ / AED / درهم                    →  "AED"
• Otherwise: use the exact ISO-4217 code you see, or null.

DATES
• Output all dates as YYYY-MM-DD.
• Arabic month names: يناير=01 فبراير=02 مارس=03 أبريل=04 مايو=05 يونيو=06
  يوليو=07 أغسطس=08 سبتمبر=09 أكتوبر=10 نوفمبر=11 ديسمبر=12.
• Hebrew month names: ינואר=01 פברואר=02 מרץ=03 אפריל=04 מאי=05 יוני=06
  יולי=07 אוגוסט=08 ספטמבר=09 אוקטובר=10 נובמבר=11 דצמבר=12.

LINE ITEMS
• Extract EVERY row from item/service tables.
• For each item: description, quantity (default 1 if missing), unitPrice, total.
• If total is missing: compute total = quantity × unitPrice.
• If unitPrice is missing: compute unitPrice = total ÷ quantity.
• Keep descriptions in their original language.

TOTALS  (CRITICAL)
• subtotal = sum of all item totals (before tax). Compute it if not printed.
• tax = any VAT, ضريبة, מע"מ, GST amount shown. Extract the NUMBER, not the %.
• totalAmount = subtotal + tax. If the invoice prints a grand total, use that.
• NEVER return null for totalAmount when any prices exist anywhere in the document.
• If you cannot find totalAmount, compute it from line items.

CONFIDENCE
• For each top-level field, add a "_conf" field: "high", "medium", or "low".
  high   = clearly printed and unambiguous.
  medium = inferred or partially visible.
  low    = guessed / not found.

━━━━━━━━━━━━━━━  OUTPUT FORMAT  ━━━━━━━━━━━━━━━

Return ONLY valid JSON, no markdown fences, no explanation:

{
  "invoiceNumber": string|null, "_conf_invoiceNumber": "high"|"medium"|"low",
  "date":          "YYYY-MM-DD"|null, "_conf_date": "high"|"medium"|"low",
  "dueDate":       "YYYY-MM-DD"|null, "_conf_dueDate": "high"|"medium"|"low",
  "currency":      string|null, "_conf_currency": "high"|"medium"|"low",
  "vendor": {
    "name": string|null, "address": string|null,
    "phone": string|null, "email": string|null,
    "taxId": string|null
  },
  "customer": {
    "name": string|null, "address": string|null,
    "phone": string|null, "email": string|null,
    "taxId": string|null
  },
  "items": [
    { "description": string, "quantity": number, "unitPrice": number, "total": number }
  ],
  "subtotal":    number|null, "_conf_subtotal":    "high"|"medium"|"low",
  "tax":         number|null, "_conf_tax":         "high"|"medium"|"low",
  "taxRate":     number|null,
  "totalAmount": number|null, "_conf_totalAmount": "high"|"medium"|"low",
  "notes":       string|null,
  "paymentTerms": string|null
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set in environment variables");
  return new OpenAI({ apiKey: key });
}

type RawExtracted = Record<string, unknown>;

// Strip "_conf_*" keys, build a clean confidence map
function splitConfidence(raw: RawExtracted) {
  const conf: Record<string, string> = {};
  const data: RawExtracted = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("_conf_")) {
      conf[k.slice(6)] = String(v ?? "low");
    } else {
      data[k] = v;
    }
  }
  return { data, conf };
}

// Sanitize a single scalar value
const clean = (v: unknown): unknown => {
  if (v === "null" || v === "" || v === 0) return null;
  return v ?? null;
};

// Ensure a value is a positive number or null
const posNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

// Validate & repair totals: recompute subtotal/total from items if AI got them wrong
function repairTotals(data: RawExtracted): RawExtracted {
  const items = Array.isArray(data.items)
    ? (data.items as Array<{ quantity?: unknown; unitPrice?: unknown; total?: unknown; description?: unknown }>)
      .map((item) => {
        const qty  = posNum(item.quantity)  ?? 1;
        const unit = posNum(item.unitPrice) ?? 0;
        const tot  = posNum(item.total)     ?? Math.round(qty * unit * 100) / 100;
        return { ...item, quantity: qty, unitPrice: unit, total: tot };
      })
    : [];

  const itemsSum = items.reduce((s, i) => s + i.total, 0);
  const roundedSum = Math.round(itemsSum * 100) / 100;

  let subtotal    = posNum(data.subtotal);
  let tax         = posNum(data.tax);
  let totalAmount = posNum(data.totalAmount);

  // If subtotal is missing but items exist, compute it
  if (subtotal === null && itemsSum > 0) subtotal = roundedSum;

  // If totalAmount is missing, compute from subtotal + tax
  if (totalAmount === null) {
    totalAmount = subtotal !== null ? Math.round(((subtotal ?? 0) + (tax ?? 0)) * 100) / 100 : null;
  }

  // If totalAmount is present but doesn't match items+tax, trust the printed total
  // but flag it by keeping both values
  const computedTotal = subtotal !== null ? Math.round(((subtotal ?? 0) + (tax ?? 0)) * 100) / 100 : null;
  const mismatch =
    totalAmount !== null &&
    computedTotal !== null &&
    Math.abs(totalAmount - computedTotal) > 0.02;

  return {
    ...data,
    items,
    subtotal,
    tax,
    totalAmount,
    ...(mismatch ? { _totalMismatch: true, _computedTotal: computedTotal } : {}),
  };
}

// ── Controller ────────────────────────────────────────────────────────────────
export const extractInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const isImage = file.mimetype.startsWith("image/");
  const isPdf   = file.mimetype === "application/pdf";

  if (!isImage && !isPdf) {
    res.status(400).json({ error: "Only images (JPEG, PNG, WebP) and PDFs are supported" });
    return;
  }

  try {
    const client = getClient();
    let responseText = "";

    if (isImage) {
      const base64 = file.buffer.toString("base64");
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${file.mimetype};base64,${base64}`, detail: "high" },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      });
      responseText = response.choices[0]?.message?.content?.trim() ?? "";

    } else {
      // PDF — upload via Files API, reference by file_id
      const arrayBuf  = file.buffer.buffer as ArrayBuffer;
      const pdfSlice  = arrayBuf.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength);
      const uploadFile = new File([pdfSlice], file.originalname || "invoice.pdf", { type: "application/pdf" });
      const uploaded  = await client.files.create({ file: uploadFile, purpose: "user_data" });

      try {
        const response = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                { type: "file", file: { file_id: uploaded.id } } as unknown as OpenAI.ChatCompletionContentPartText,
                { type: "text", text: EXTRACTION_PROMPT },
              ],
            },
          ],
        });
        responseText = response.choices[0]?.message?.content?.trim() ?? "";
      } finally {
        await client.files.delete(uploaded.id).catch(() => { /* best-effort */ });
      }
    }

    // Strip any accidental markdown fences
    const jsonMatch = responseText.replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(422).json({ error: "Could not extract invoice data from the document" });
      return;
    }

    const rawParsed = JSON.parse(jsonMatch[0]) as RawExtracted;
    const { data: rawData, conf } = splitConfidence(rawParsed);

    // Clean scalar fields
    const cleaned: RawExtracted = {
      invoiceNumber:  clean(rawData.invoiceNumber),
      date:           clean(rawData.date),
      dueDate:        clean(rawData.dueDate),
      currency:       clean(rawData.currency),
      vendor:         rawData.vendor   ?? null,
      customer:       rawData.customer ?? null,
      items:          Array.isArray(rawData.items) ? rawData.items : [],
      subtotal:       rawData.subtotal,
      tax:            rawData.tax,
      taxRate:        posNum(rawData.taxRate),
      totalAmount:    rawData.totalAmount,
      notes:          clean(rawData.notes),
      paymentTerms:   clean(rawData.paymentTerms),
    };

    // Repair & validate totals
    const repaired = repairTotals(cleaned);

    res.json({
      success: true,
      data: repaired,
      confidence: conf,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    console.error("AI invoice extraction error:", msg);
    res.status(500).json({ error: msg });
  }
};
