import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SettingsModal } from '@/components/SettingsModal';

interface ApiContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  showSettingsModal: (connectionError?: boolean) => void;
  hideSettingsModal: () => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const API_URL_KEY = 'test_client_api_url';
const DEFAULT_API_URL = 'http://localhost:3002';

export function ApiProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or env var or default
  const [apiUrl, setApiUrlState] = useState<string>(() => {
    // Priority: localStorage > env var > default
    const stored = localStorage.getItem(API_URL_KEY);
    if (stored) return stored;

    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;

    return DEFAULT_API_URL;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  // Persist to localStorage whenever it changes
  const setApiUrl = (url: string) => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    setApiUrlState(cleanUrl);
    localStorage.setItem(API_URL_KEY, cleanUrl);
    console.log(`[API] URL updated to: ${cleanUrl}`);
  };

  const showSettingsModal = (hasConnectionError = false) => {
    setConnectionError(hasConnectionError);
    setSettingsOpen(true);
  };

  const hideSettingsModal = () => {
    setConnectionError(false);
    setSettingsOpen(false);
  };

  // Log current API URL on mount
  useEffect(() => {
    console.log(`[API] Initialized with URL: ${apiUrl}`);
  }, []);

  // Listen for custom events from api.ts to show settings modal
  useEffect(() => {
    const handleShowSettings = (event: Event) => {
      const customEvent = event as CustomEvent<{ connectionError?: boolean }>;
      const hasConnectionError = customEvent.detail?.connectionError || false;
      showSettingsModal(hasConnectionError);
    };

    window.addEventListener('show-api-settings', handleShowSettings);

    return () => {
      window.removeEventListener('show-api-settings', handleShowSettings);
    };
  }, []);

  return (
    <ApiContext.Provider value={{ apiUrl, setApiUrl, showSettingsModal, hideSettingsModal }}>
      {children}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={(open) => {
          if (!open) hideSettingsModal();
        }}
        currentUrl={apiUrl}
        onSave={setApiUrl}
        connectionError={connectionError}
      />
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
