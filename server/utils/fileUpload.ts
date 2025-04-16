import * as path from 'path';
import * as fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Create upload directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept excel and csv files
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'text/csv'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel and CSV files are allowed'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Middleware to handle file upload errors
export function handleFileUploadErrors(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      message: `File upload error: ${err.message}`,
    });
  }

  if (err) {
    // Other errors
    return res.status(400).json({
      message: err.message || 'Something went wrong with file upload',
    });
  }

  next();
}