import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createPurchase,
  deletePurchase,
  getSupplierOptions,
  getAllPurchases,
  getMyPurchases,
  updatePurchase,
} from "../services/purchaseServices";

const toPublicFileUrl = (
  req: AuthenticatedRequest,
  filePath?: string | null,
) => {
  if (!filePath || !filePath.trim()) {
    return undefined;
  }

  const normalized = filePath
    .replace(/^prisma[\\/]+pictures[\\/]+/i, "")
    .replace(/^pictures[\\/]+/i, "")
    .replace(/^\/+/, "");

  if (!normalized) {
    return undefined;
  }

  return `${req.protocol}://${req.get("host")}/pictures/${normalized}`;
};

const decorateInvoiceLinks = (
  req: AuthenticatedRequest,
  payload: unknown,
): unknown => {
  if (Array.isArray(payload)) {
    return payload.map((item) => decorateInvoiceLinks(req, item));
  }

  if (!payload || typeof payload !== "object" || payload instanceof Date) {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === "fileAttachments" && Array.isArray(value)) {
      result[key] = value.map((attachment) => {
        if (
          !attachment ||
          typeof attachment !== "object" ||
          attachment instanceof Date
        ) {
          return attachment;
        }

        const attachmentRecord = attachment as Record<string, unknown>;
        return {
          ...attachmentRecord,
          publicUrl: toPublicFileUrl(
            req,
            typeof attachmentRecord.filePath === "string"
              ? attachmentRecord.filePath
              : undefined,
          ),
        };
      });
      continue;
    }

    result[key] = decorateInvoiceLinks(req, value);
  }

  if (typeof source.invoiceImage === "string") {
    result.invoiceUrl = toPublicFileUrl(req, source.invoiceImage);
  }

  return result;
};

const normalizePurchasePayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object" || payload instanceof Date) {
    return payload;
  }

  const normalized = { ...(payload as Record<string, unknown>) };
  if (typeof normalized.items === "string") {
    try {
      normalized.items = JSON.parse(normalized.items);
    } catch {
      // Keep original value; service validation will return a clear error.
    }
  }

  return normalized;
};

export const createPurchaseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "Invoice image is required for new purchases" });
      return;
    }

    const invoiceFile = {
      fileName: req.file.originalname,
      filePath: `prisma/pictures/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    const payload = normalizePurchasePayload(req.body ?? {});

    const result = await createPurchase(userId, {
      ...(payload ?? {}),
      invoiceImage: invoiceFile.filePath,
      invoiceFile,
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(decorateInvoiceLinks(req, result.data));
  } catch (error) {
    console.error("Create purchase error:", error);
    res.status(500).json({ message: "Failed to create purchase" });
  }
};

export const getAllPurchasesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getAllPurchases();
    res.status(result.status).json(decorateInvoiceLinks(req, result.data));
  } catch (error) {
    console.error("Get all purchases error:", error);
    res.status(500).json({ message: "Failed to fetch purchases" });
  }
};

export const getMyPurchasesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const result = await getMyPurchases(userId);
    res.status(result.status).json(decorateInvoiceLinks(req, result.data));
  } catch (error) {
    console.error("Get my purchases error:", error);
    res.status(500).json({ message: "Failed to fetch my purchases" });
  }
};

export const updatePurchaseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const invoiceFile = req.file
      ? {
          fileName: req.file.originalname,
          filePath: `prisma/pictures/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        }
      : undefined;

    const payload = normalizePurchasePayload(req.body ?? {});

    const result = await updatePurchase(userId, id, {
      ...(payload ?? {}),
      ...(invoiceFile
        ? { invoiceImage: invoiceFile.filePath, invoiceFile }
        : {}),
    });

    if (result.message) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(decorateInvoiceLinks(req, result.data));
  } catch (error) {
    console.error("Update purchase error:", error);
    res.status(500).json({ message: "Failed to update purchase" });
  }
};

export const deletePurchaseHandler = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ message: "id must be a positive integer" });
      return;
    }

    const result = await deletePurchase(userId, id);
    if (result.message && result.status !== 200) {
      res.status(result.status).json({ message: result.message });
      return;
    }

    res.status(result.status).json(decorateInvoiceLinks(req, result.data));
  } catch (error) {
    console.error("Delete purchase error:", error);
    res.status(500).json({ message: "Failed to delete purchase" });
  }
};

export const getSupplierOptionsHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await getSupplierOptions();
    res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Get supplier options error:", error);
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
};
