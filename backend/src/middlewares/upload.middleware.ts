import multer from "multer";
import createHttpError from "http-errors";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(createHttpError(400, "Only JPG, PNG, WEBP images allowed") as unknown as null, false);
    }
  },
});
