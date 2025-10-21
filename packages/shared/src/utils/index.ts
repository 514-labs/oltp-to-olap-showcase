import { Request, Response } from 'express';
import { ApiResponse, PaginatedResponse, ErrorResponse } from '../types';

/**
 * Shared Utilities for OLTP to OLAP Demo Applications
 *
 * These utility functions are completely decoupled from any specific ORM
 * and provide common functionality across all demo applications.
 */

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export const createSuccessResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    data,
    message,
    timestamp: new Date().toISOString(),
  };
};

export const createErrorResponse = (
  error: string,
  message: string,
  statusCode: number = 500,
  stack?: string
): ErrorResponse => {
  return {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(stack && { stack }),
  };
};

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    timestamp: new Date().toISOString(),
  };
};

// ============================================================================
// HTTP RESPONSE HELPERS
// ============================================================================

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
) => {
  const response = createSuccessResponse(data, message);
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  message: string,
  statusCode: number = 500,
  stack?: string
) => {
  const response = createErrorResponse(error, message, statusCode, stack);
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
) => {
  const response = createPaginatedResponse(data, page, limit, total);
  res.json(response);
};

export const sendCreated = <T>(res: Response, data: T, message?: string) => {
  sendSuccess(res, data, 201, message);
};

export const sendNoContent = (res: Response) => {
  res.status(204).send();
};

export const sendNotFound = (res: Response, resource: string = 'Resource') => {
  sendError(res, 'Not Found', `${resource} not found`, 404);
};

export const sendBadRequest = (res: Response, message: string) => {
  sendError(res, 'Bad Request', message, 400);
};

export const sendValidationError = (res: Response, message: string) => {
  sendError(res, 'Validation Error', message, 400);
};

export const sendInternalError = (res: Response, message: string = 'Internal Server Error') => {
  sendError(res, 'Internal Server Error', message, 500);
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return !isNaN(dateObj.getTime());
};

export const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const isValidInteger = (value: any): boolean => {
  return isValidNumber(value) && Number.isInteger(value);
};

export const isValidPositiveNumber = (value: any): boolean => {
  return isValidNumber(value) && value > 0;
};

export const isValidNonNegativeNumber = (value: any): boolean => {
  return isValidNumber(value) && value >= 0;
};

// ============================================================================
// STRING HELPERS
// ============================================================================

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const camelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

export const kebabCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

export const snakeCase = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
};

export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ============================================================================
// ARRAY HELPERS
// ============================================================================

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const uniqueBy = <T, K>(array: T[], key: (item: T) => K): T[] => {
  const seen = new Set<K>();
  return array.filter((item) => {
    const keyValue = key(item);
    if (seen.has(keyValue)) {
      return false;
    }
    seen.add(keyValue);
    return true;
  });
};

export const groupBy = <T, K>(array: T[], key: (item: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of array) {
    const keyValue = key(item);
    if (!groups.has(keyValue)) {
      groups.set(keyValue, []);
    }
    groups.get(keyValue)!.push(item);
  }
  return groups;
};

export const sortBy = <T>(
  array: T[],
  key: (item: T) => any,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = key(a);
    const bVal = key(b);
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// ============================================================================
// OBJECT HELPERS
// ============================================================================

export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (result as any)[key] = obj[key];
    }
  }
  return result;
};

export const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj } as any;
  for (const key of keys) {
    delete result[key];
  }
  return result;
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

// ============================================================================
// DATE HELPERS
// ============================================================================

export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

export const getDaysBetween = (date1: Date, date2: Date): number => {
  const timeDiff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNext,
    hasPrev,
  };
};

export const validatePaginationParams = (page: number, limit: number): string[] => {
  const errors: string[] = [];

  if (!isValidPositiveNumber(page)) {
    errors.push('Page must be a positive integer');
  }

  if (!isValidPositiveNumber(limit)) {
    errors.push('Limit must be a positive integer');
  }

  if (limit > 100) {
    errors.push('Limit cannot exceed 100');
  }

  return errors;
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================
