import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl: string;
  onSave: (url: string) => void;
  connectionError?: boolean;
}

// Read ports from environment variables or use defaults
const getBackendPort = (envVarName: string, defaultPort: number): number => {
  const envPort = import.meta.env[envVarName];
  return envPort ? parseInt(envPort, 10) : defaultPort;
};

const PRESET_BACKENDS = [
  {
    name: 'TypeORM',
    port: getBackendPort('VITE_TYPEORM_PORT', 3000),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
  {
    name: 'SQLModel',
    port: getBackendPort('VITE_SQLMODEL_PORT', 3002),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
  {
    name: 'Drizzle',
    port: getBackendPort('VITE_DRIZZLE_PORT', 3003),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
  {
    name: 'Prisma',
    port: getBackendPort('VITE_PRISMA_PORT', 3004),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
  {
    name: 'Sequelize',
    port: getBackendPort('VITE_SEQUELIZE_PORT', 3005),
    get url() {
      return `http://localhost:${this.port}`;
    },
  },
];

export function SettingsModal({
  open,
  onOpenChange,
  currentUrl,
  onSave,
  connectionError = false,
}: SettingsModalProps) {
  const [apiUrl, setApiUrl] = useState(currentUrl);

  // Update internal state when currentUrl changes
  useEffect(() => {
    setApiUrl(currentUrl);
  }, [currentUrl]);

  const handleSave = () => {
    // Trim whitespace and ensure no trailing slash
    const cleanUrl = apiUrl.trim().replace(/\/$/, '');
    onSave(cleanUrl);
    onOpenChange(false);
  };

  const handlePresetSelect = (url: string) => {
    setApiUrl(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {connectionError ? '⚠️ Connection Error' : 'API Settings'}
          </DialogTitle>
          <DialogDescription>
            {connectionError ? (
              <span className="text-red-600 font-medium">
                Unable to connect to the backend API. Please check the URL and ensure the backend
                server is running.
              </span>
            ) : (
              'Configure which backend API to connect to'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="rounded-lg bg-gray-50 p-3 space-y-1">
            <p className="text-sm font-medium">Current API URL:</p>
            <p className="text-sm text-gray-600 font-mono break-all">{currentUrl}</p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Select Backend:</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_BACKENDS.map((backend) => (
                <Card
                  key={backend.name}
                  className={`cursor-pointer hover:border-blue-500 transition-colors ${
                    apiUrl === backend.url ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handlePresetSelect(backend.url)}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{backend.name}</p>
                    <p className="text-xs text-gray-600">Port {backend.port}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom URL Input */}
          <div className="space-y-2">
            <Label htmlFor="api-url">Custom API URL:</Label>
            <Input
              id="api-url"
              placeholder="http://localhost:3000"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              Enter the full URL including http:// and port number
            </p>
          </div>

          {/* Help Text */}
          <div className="rounded-lg bg-blue-50 p-3 space-y-1">
            <p className="text-sm font-medium text-blue-900">💡 Troubleshooting:</p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
              <li>Ensure your backend server is running</li>
              <li>Check that the port number matches your backend</li>
              <li>Verify CORS is enabled on your backend</li>
              <li>
                Test with: <code className="bg-blue-100 px-1 rounded">curl {apiUrl}/health</code>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!apiUrl.trim()}>
            Save & Reconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
