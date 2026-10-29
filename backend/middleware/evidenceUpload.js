import { mkdirSync } from "node:fs";
import { access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const currentFile = fileURLToPath(import.meta.url);
export const uploadDirectory = resolve(dirname(currentFile), "../uploads");
mkdirSync(uploadDirectory, { recursive: true });

const acceptedTypes = new Map([
  [".pdf", new Set(["application/pdf"])],
  [".txt", new Set(["text/plain"])],
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".webp", new Set(["image/webp"])]
]);

export const evidenceUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const mimeTypes = acceptedTypes.get(extension);
    if (!mimeTypes?.has(file.mimetype)) {
      callback(new Error("Evidence files must be PDF, TXT, PNG, JPG, or WEBP."));
      return;
    }
    callback(null, true);
  }
});

export function handleEvidenceUpload(req, res, next) {
  evidenceUpload.single("file")(req, res, (error) => {
    if (error instanceof multer.MulterError || error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Could not process the evidence file."
      });
    }

    return next();
  });
}

export async function evidenceFileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
