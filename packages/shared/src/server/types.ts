/**
 * Server-related types and interfaces
 */

import { Server } from 'http';
import { Application } from 'express';

export interface ServerConfig {
  port: number;
  app: Application;
  name: string;
  version: string;
}

export interface ServerState {
  server: Server | null;
  isShuttingDown: boolean;
  isInitialized: boolean;
}

export interface PortOptions {
  startPort: number;
  maxAttempts?: number;
  host?: string;
}

export interface GracefulShutdownOptions {
  timeout?: number;
  signals?: string[];
  onShutdown?: () => Promise<void>;
}
