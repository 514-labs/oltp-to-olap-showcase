/**
 * Idempotent server factory
 */

import { createServer, Server } from 'http';
import { Application } from 'express';
import { ServerConfig, ServerState, PortOptions } from './types';
import { findAvailablePort } from './port-utils';
import { createGracefulShutdownHandler } from './graceful-shutdown';

/**
 * Create an idempotent server with automatic port management
 */
export class IdempotentServer {
  private state: ServerState = {
    server: null,
    isShuttingDown: false,
    isInitialized: false,
  };

  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  /**
   * Start the server with idempotent behavior
   */
  async start(portOptions?: Partial<PortOptions>): Promise<number> {
    try {
      // Prevent multiple server instances
      if (this.state.server) {
        console.log(`${this.config.name} is already running`);
        return this.getCurrentPort();
      }

      if (this.state.isShuttingDown) {
        console.log(`${this.config.name} is shutting down, cannot start`);
        throw new Error('Server is shutting down');
      }

      // Find an available port
      const options: PortOptions = {
        startPort: this.config.port,
        maxAttempts: 10,
        ...portOptions,
      };

      const port = await findAvailablePort(options);

      if (port !== this.config.port) {
        console.log(`Port ${this.config.port} is busy, using port ${port} instead`);
      }

      // Create HTTP server
      this.state.server = createServer(this.config.app);

      // Set up graceful shutdown
      createGracefulShutdownHandler(this.state.server, {
        onShutdown: async () => {
          this.state.isShuttingDown = true;
          this.state.server = null;
          this.state.isInitialized = false;
        },
      });

      // Start listening with retry logic
      const actualPort = await this.startListening(port);

      return actualPort;
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Start listening on the server with automatic retry
   */
  private async startListening(initialPort: number): Promise<number> {
    let currentPort = initialPort;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        await new Promise<void>((resolve, reject) => {
          const server = this.state.server!;

          server.listen(currentPort, () => {
            this.state.isInitialized = true;
            console.log(
              `🚀 ${this.config.name} v${this.config.version} running on http://localhost:${currentPort}`
            );
            console.log(
              `📚 API Documentation available at http://localhost:${currentPort}/reference`
            );
            console.log(`🏥 Health check available at http://localhost:${currentPort}/health`);
            resolve();
          });

          server.once('error', (error: any) => {
            if (error.code === 'EADDRINUSE') {
              console.log(`Port ${currentPort} is already in use, trying next port...`);
              // Close the server before rejecting to clean up
              server.close();
              reject(new Error(`Port ${currentPort} is busy`));
            } else {
              console.error('Server error:', error);
              reject(error);
            }
          });
        });

        // If we get here, the server started successfully
        return currentPort;
      } catch (error: any) {
        attempts++;
        if (error.message.includes('Port') && error.message.includes('busy')) {
          // Try next port - create a new server instance for the next attempt
          if (this.state.server) {
            this.state.server.close();
            this.state.server = createServer(this.config.app);
            // Re-setup graceful shutdown for the new server
            createGracefulShutdownHandler(this.state.server, {
              onShutdown: async () => {
                this.state.isShuttingDown = true;
                this.state.server = null;
                this.state.isInitialized = false;
              },
            });
          }
          currentPort++;
          if (attempts >= maxAttempts) {
            throw new Error(`No available port found in range ${initialPort}-${currentPort}`);
          }
        } else {
          // Non-port related error, don't retry
          throw error;
        }
      }
    }

    throw new Error(`No available port found after ${maxAttempts} attempts`);
  }

  /**
   * Stop the server gracefully
   */
  async stop(): Promise<void> {
    if (!this.state.server) {
      console.log('Server is not running');
      return;
    }

    return new Promise<void>((resolve) => {
      this.state.server!.close(() => {
        console.log('Server stopped');
        this.state.server = null;
        this.state.isInitialized = false;
        resolve();
      });
    });
  }

  /**
   * Get the current port (if server is running)
   */
  getCurrentPort(): number {
    if (!this.state.server) {
      throw new Error('Server is not running');
    }
    const address = this.state.server.address();
    if (typeof address === 'string') {
      return this.config.port;
    }
    return address?.port || this.config.port;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.state.server !== null && this.state.isInitialized;
  }

  /**
   * Get server state
   */
  getState(): ServerState {
    return { ...this.state };
  }
}

/**
 * Factory function to create an idempotent server
 */
export function createIdempotentServer(config: ServerConfig): IdempotentServer {
  return new IdempotentServer(config);
}
