import { Request, Response, NextFunction } from 'express';

/**
 * Shared Types for OLTP to OLAP Demo Applications
 *
 * These types are completely decoupled from any specific ORM
 * and can be used across all demo applications.
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse extends ApiResponse {
  error: string;
  message: string;
  statusCode: number;
  stack?: string;
}

// ============================================================================
// CRUD OPERATION TYPES
// ============================================================================

export interface CrudOperations<T> {
  findAll(): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
}

export interface PaginatedCrudOperations<T> extends CrudOperations<T> {
  findPaginated(
    page: number,
    limit: number
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule[];
}

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export type ErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => void;

export type ValidationHandler = (req: Request, res: Response, next: NextFunction) => void;

// ============================================================================
// ENTITY INTERFACES (ORM-AGNOSTIC)
// ============================================================================

export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerEntity extends BaseEntity {
  email: string;
  name: string;
  country: string;
  city: string;
}

export interface ProductEntity extends BaseEntity {
  name: string;
  category: string;
  price: number;
}

export interface OrderEntity extends BaseEntity {
  customerId: number;
  orderDate: Date;
  status: string;
  total: number;
}

export interface OrderItemEntity extends BaseEntity {
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
}

// ============================================================================
// API ENDPOINT CONFIGURATION
// ============================================================================

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: AsyncHandler;
  middleware?: (AsyncHandler | ValidationHandler)[];
  description?: string;
  tags?: string[];
}

export interface ApiRouteGroup {
  prefix: string;
  endpoints: ApiEndpoint[];
  middleware?: (AsyncHandler | ValidationHandler)[];
}

// ============================================================================
// DOCUMENTATION TYPES
// ============================================================================

export interface ApiDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  routes: ApiRouteGroup[];
  schemas: {
    [key: string]: any;
  };
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: {
        summary: string;
        description?: string;
        tags?: string[];
        parameters?: Array<{
          name: string;
          in: 'query' | 'path' | 'header';
          required: boolean;
          schema: any;
        }>;
        requestBody?: {
          required: boolean;
          content: {
            'application/json': {
              schema: any;
            };
          };
        };
        responses: {
          [statusCode: string]: {
            description: string;
            content?: {
              'application/json': {
                schema: any;
              };
            };
          };
        };
      };
    };
  };
  components: {
    schemas: {
      [key: string]: any;
    };
  };
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: string;
      details?: any;
    };
  };
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: {
    requestId?: string;
    userId?: string;
    method?: string;
    url?: string;
    statusCode?: number;
    responseTime?: number;
  };
  metadata?: any;
}

export interface Logger {
  debug(message: string, metadata?: any): void;
  info(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  error(message: string, metadata?: any): void;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AppConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type HttpStatusCode =
  | 200
  | 201
  | 202
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500
  | 502
  | 503
  | 504;

export interface RequestContext {
  requestId: string;
  userId?: string;
  timestamp: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
