/**
 * Shared Package for OLTP to OLAP Demo Applications
 *
 * This package provides common functionality that is completely decoupled
 * from any specific ORM and can be used across all demo applications.
 */

// Export all types
export * from './types';

// Export all middleware
export * from './middleware';

// Export all routes
export * from './routes';

// Export all utilities
export * from './utils';

// Export server utilities
export * from './server';

// Re-export commonly used Express types for convenience
export { Request, Response, NextFunction, Router } from 'express';
