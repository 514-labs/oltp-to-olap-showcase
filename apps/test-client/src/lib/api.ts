import type {
  Customer,
  CustomerInput,
  Product,
  ProductInput,
  Order,
  OrderInput,
  OrderItem,
  OrderItemInput,
  ApiResponse,
} from './types';

const API_URL_KEY = 'test_client_api_url';
const DEFAULT_API_URL = 'http://localhost:3002';

// Custom event for triggering settings modal
export const SHOW_SETTINGS_EVENT = 'show-api-settings';

function getApiBaseUrl(): string {
  // Priority: localStorage > env var > default
  const stored = localStorage.getItem(API_URL_KEY);
  if (stored) return stored;

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  return DEFAULT_API_URL;
}

function showSettingsModal(connectionError = false) {
  window.dispatchEvent(
    new CustomEvent(SHOW_SETTINGS_EVENT, { detail: { connectionError } })
  );
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    // Check if it's a network/connection error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`[API] Connection failed to ${apiBaseUrl}${endpoint}`);
      // Trigger settings modal on connection error
      showSettingsModal(true);
      throw new Error(`Unable to connect to backend at ${apiBaseUrl}. Please check your settings.`);
    }
    throw error;
  }
}

export const customersApi = {
  getAll: () => fetchApi<ApiResponse<Customer[]>>('/api/customers'),
  getById: (id: number) => fetchApi<ApiResponse<Customer>>(`/api/customers/${id}`),
  create: (data: CustomerInput) =>
    fetchApi<ApiResponse<Customer>>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: CustomerInput) =>
    fetchApi<ApiResponse<Customer>>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),
};

export const productsApi = {
  getAll: () => fetchApi<ApiResponse<Product[]>>('/api/products'),
  getById: (id: number) => fetchApi<ApiResponse<Product>>(`/api/products/${id}`),
  create: (data: ProductInput) =>
    fetchApi<ApiResponse<Product>>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: ProductInput) =>
    fetchApi<ApiResponse<Product>>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/api/products/${id}`, {
      method: 'DELETE',
    }),
};

export const ordersApi = {
  getAll: () => fetchApi<ApiResponse<Order[]>>('/api/orders'),
  getById: (id: number) => fetchApi<ApiResponse<Order>>(`/api/orders/${id}`),
  create: (data: OrderInput) =>
    fetchApi<ApiResponse<Order>>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: OrderInput) =>
    fetchApi<ApiResponse<Order>>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/api/orders/${id}`, {
      method: 'DELETE',
    }),
};

export const orderItemsApi = {
  getAll: () => fetchApi<ApiResponse<OrderItem[]>>('/api/order-items'),
  getById: (id: number) => fetchApi<ApiResponse<OrderItem>>(`/api/order-items/${id}`),
  create: (data: OrderItemInput) =>
    fetchApi<ApiResponse<OrderItem>>('/api/order-items', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: OrderItemInput) =>
    fetchApi<ApiResponse<OrderItem>>(`/api/order-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<void>(`/api/order-items/${id}`, {
      method: 'DELETE',
    }),
};
