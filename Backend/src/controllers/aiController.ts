import type { Request, Response } from "express";
import OpenAI from "openai";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

const EXTRACTION_PROMPT = `You are an expert invoice data extraction system. The invoice may be written in Arabic, English, or a mix of both. Extract all data accurately and return ONLY a valid JSON object.

IMPORTANT RULES:
- The invoice may be fully in Arabic — read it carefully.
- Convert ALL Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard Western digits (0123456789).
- All numeric fields (quantities, prices, totals) MUST be plain numbers, never strings.
- Currency: if you see ₪ or "شيقل" or "ש״ח" use "ILS". If "$" use "USD". If "€" use "EUR". If "ريال" use "SAR". Otherwise use the ISO code.
- dates: output as YYYY-MM-DD. Convert Arabic month names to the correct date.
- If the invoice lists line items, compute totalAmount = sum of all item totals + tax. NEVER leave totalAmount as null if any prices are present.
- Descriptions and names may stay in Arabic — do not translate them.

Return ONLY this JSON (use null only if the field is truly absent):
{
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "vendor": { "name": "string or null", "address": "string or null", "phone": "string or null", "email": "string or null" },
  "customer": { "name": "string or null", "address": "string or null", "phone": "string or null", "email": "string or null" },
  "items": [{ "description": "string", "quantity": number, "unitPrice": number, "total": number }],
  "subtotal": number or null,
  "tax": number or null,
  "totalAmount": number or null,
  "currency": "string or null",
  "notes": "string or null"
}
No markdown fences, no explanation — JSON only.`;

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set in environment variables");
  return new OpenAI({ apiKey: key });
}

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
    const client  = getClient();
    const base64  = file.buffer.toString("base64");
    let responseText = "";

    if (isImage) {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2048,
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
      // PDF: upload to Files API then reference by file_id in the message
      const arrayBuf = file.buffer.buffer as ArrayBuffer;
      const upload  = new File([arrayBuf.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength)], file.originalname || "invoice.pdf", { type: "application/pdf" });
      const uploaded = await client.files.create({ file: upload, purpose: "user_data" });

      try {
        const response = await client.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              // file content block is supported by gpt-4o but not yet reflected in SDK types
              content: [
                { type: "file", file: { file_id: uploaded.id } } as unknown as OpenAI.ChatCompletionContentPartText,
                { type: "text", text: EXTRACTION_PROMPT },
              ],
            },
          ],
        });
        responseText = response.choices[0]?.message?.content?.trim() ?? "";
      } finally {
        await client.files.delete(uploaded.id).catch(() => { /* best-effort cleanup */ });
      }
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(422).json({ error: "Could not extract invoice data from the document" });
      return;
    }

    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Sanitize: GPT sometimes returns "null" strings, empty strings, or 0 for missing values
    const clean = (v: unknown) => (v === "null" || v === "" || v === 0) ? null : v;
    const data = {
      invoiceNumber: clean(raw.invoiceNumber),
      date:          clean(raw.date),
      dueDate:       clean(raw.dueDate),
      currency:      clean(raw.currency),
      vendor:        raw.vendor   ?? null,
      customer:      raw.customer ?? null,
      items:         Array.isArray(raw.items) ? raw.items : [],
      subtotal:      typeof raw.subtotal    === "number" && raw.subtotal    > 0 ? raw.subtotal    : null,
      tax:           typeof raw.tax         === "number" && raw.tax         > 0 ? raw.tax         : null,
      totalAmount:   typeof raw.totalAmount === "number" && raw.totalAmount > 0 ? raw.totalAmount : null,
      notes:         clean(raw.notes),
    };

    res.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    console.error("AI invoice extraction error:", msg);
    res.status(500).json({ error: msg });
  }
};
