/**
 * Graceful shutdown utilities
 */

import { Server } from 'http';
import { GracefulShutdownOptions } from './types';

/**
 * Create a graceful shutdown handler
 */
export function createGracefulShutdownHandler(
  server: Server | null,
  options: GracefulShutdownOptions = {}
) {
  const { timeout = 10000, signals = ['SIGINT', 'SIGTERM'], onShutdown } = options;
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('Already shutting down...');
      return;
    }

    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    try {
      // Close HTTP server
      if (server) {
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(() => {
            console.log('Force closing server due to timeout');
            resolve();
          }, timeout);

          server.close(() => {
            clearTimeout(timeoutId);
            console.log('HTTP server closed');
            resolve();
          });
        });
      }

      // Run custom shutdown logic
      if (onShutdown) {
        await onShutdown();
      }

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Set up signal handlers
  signals.forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });

  return gracefulShutdown;
}
