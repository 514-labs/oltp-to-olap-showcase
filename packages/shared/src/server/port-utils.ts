/**
 * Port availability utilities
 */

import net from 'net';
import { PortOptions } from './types';

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number, host: string = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, host, () => {
      // Port is available, close the server and resolve true
      server.close(() => {
        resolve(true);
      });
    });

    server.on('error', (err: any) => {
      // Port is not available
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(false);
      } else {
        // Other error, assume port is not available
        resolve(false);
      }
    });
  });
}

/**
 * Find an available port starting from the given port
 */
export async function findAvailablePort(options: PortOptions): Promise<number> {
  const { startPort, maxAttempts = 10, host = 'localhost' } = options;
  let port = startPort;

  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    port++;
  }

  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Get the next available port after a given port
 */
export async function getNextAvailablePort(
  currentPort: number,
  host: string = 'localhost'
): Promise<number> {
  return findAvailablePort({ startPort: currentPort + 1, maxAttempts: 5, host });
}
