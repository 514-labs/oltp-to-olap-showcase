import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  ErrorHandler,
  AsyncHandler,
  ValidationHandler,
  ValidationSchema,
  RequestContext,
  ErrorResponse,
  ApiResponse,
} from '../types';

/**
 * Shared Middleware for OLTP to OLAP Demo Applications
 *
 * These middleware functions are completely decoupled from any specific ORM
 * and provide common functionality across all demo applications.
 */

// ============================================================================
// REQUEST CONTEXT MIDDLEWARE
// ============================================================================

export const requestContextMiddleware: AsyncHandler = async (req, res, next) => {
  const context: RequestContext = {
    requestId: uuidv4(),
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
  };

  // Add context to request object
  (req as any).context = context;

  // Add request ID to response headers
  res.set('X-Request-ID', context.requestId);

  next();
};

// ============================================================================
// LOGGING MIDDLEWARE
// ============================================================================

export const loggingMiddleware: AsyncHandler = async (req, res, next) => {
  const startTime = Date.now();
  const context = (req as any).context as RequestContext;

  // Log request
  console.log(`[${context.requestId}] ${req.method} ${req.url} - Started`);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    console.log(
      `[${context.requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`
    );
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

export const errorHandler: ErrorHandler = (err, req, res, next) => {
  const context = (req as any).context as RequestContext;

  console.error(`[${context.requestId}] Error:`, err);

  const errorResponse: ErrorResponse = {
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode: (err as any).statusCode || 500,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(errorResponse.statusCode).json(errorResponse);
};

// ============================================================================
// 404 HANDLER
// ============================================================================

export const notFoundHandler: AsyncHandler = async (req, res, next) => {
  const context = (req as any).context as RequestContext;

  const errorResponse: ErrorResponse = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(errorResponse);
};

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

export const createValidationMiddleware = (schema: ValidationSchema): ValidationHandler => {
  return (req, res, next) => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      for (const rule of rules) {
        // Check required
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} is required`);
          continue;
        }

        // Skip other validations if value is empty and not required
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validation
        if (rule.type) {
          switch (rule.type) {
            case 'string':
              if (typeof value !== 'string') {
                errors.push(`${field} must be a string`);
              }
              break;
            case 'number':
              if (typeof value !== 'number' || isNaN(value)) {
                errors.push(`${field} must be a number`);
              }
              break;
            case 'boolean':
              if (typeof value !== 'boolean') {
                errors.push(`${field} must be a boolean`);
              }
              break;
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (typeof value !== 'string' || !emailRegex.test(value)) {
                errors.push(`${field} must be a valid email address`);
              }
              break;
            case 'date':
              if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                errors.push(`${field} must be a valid date`);
              }
              break;
          }
        }

        // String length validation
        if (typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`${field} must be at least ${rule.minLength} characters long`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`${field} must be no more than ${rule.maxLength} characters long`);
          }
        }

        // Number range validation
        if (typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            errors.push(`${field} must be at least ${rule.min}`);
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push(`${field} must be no more than ${rule.max}`);
          }
        }

        // Pattern validation
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }

        // Custom validation
        if (rule.custom) {
          const result = rule.custom(value);
          if (result !== true) {
            errors.push(typeof result === 'string' ? result : `${field} is invalid`);
          }
        }
      }
    }

    if (errors.length > 0) {
      const errorResponse: ErrorResponse = {
        error: 'Validation Error',
        message: errors.join(', '),
        statusCode: 400,
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(errorResponse);
    }

    next();
  };
};

// ============================================================================
// PAGINATION MIDDLEWARE
// ============================================================================

export const paginationMiddleware: AsyncHandler = async (req, res, next) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  // Validate pagination parameters
  if (page < 1) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Page must be greater than 0',
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (limit < 1 || limit > 100) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Limit must be between 1 and 100',
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Add pagination to request
  (req as any).pagination = { page, limit };

  next();
};

// ============================================================================
// RESPONSE FORMATTER MIDDLEWARE
// ============================================================================

export const responseFormatterMiddleware: AsyncHandler = async (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body: any) {
    // Don't format if it's already an error response
    if (body && body.error) {
      return originalJson.call(this, body);
    }

    // Don't format if it's already a formatted response
    if (body && body.timestamp) {
      return originalJson.call(this, body);
    }

    // Format successful responses
    const formattedResponse: ApiResponse = {
      data: body,
      timestamp: new Date().toISOString(),
    };

    return originalJson.call(this, formattedResponse);
  };

  next();
};

// ============================================================================
// CORS MIDDLEWARE CONFIGURATION
// ============================================================================

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, you would check against allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// ============================================================================
// HELMET MIDDLEWARE CONFIGURATION
// ============================================================================

export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
};

// ============================================================================
// EXPORT ALL MIDDLEWARE
// ============================================================================
