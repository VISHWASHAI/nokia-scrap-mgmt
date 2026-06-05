import { AppError } from '../utils/AppError.js';

export function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { message: 'A record with that value already exists.', code: 'DUPLICATE_ENTRY' },
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { message: 'Record not found.', code: 'NOT_FOUND' },
    });
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
  });
}
