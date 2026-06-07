import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../prisma/pictures");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

function clientError(msg: string): Error {
  const err = new Error(msg) as Error & { status: number };
  err.status = 400;
  return err;
}

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(clientError("Only image files are allowed"));
  }
};

const invoiceFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(clientError("Only image and PDF files are allowed"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export const uploadInvoice = multer({
  storage,
  fileFilter: invoiceFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const docFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(clientError("Only image, PDF, and Word document files are allowed"));
  }
};

export const uploadDoc = multer({
  storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for documents
});

export const uploadDocFields = uploadDoc.fields([
  { name: "file", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);
