export interface Customer {
  id: number;
  email: string;
  name: string;
  country: string;
  city: string;
  createdAt: string;
  orders?: Order[];
}

export interface CustomerInput {
  email: string;
  name: string;
  country: string;
  city: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt: string;
}

export interface ProductInput {
  name: string;
  category: string;
  price: number;
}

export interface Order {
  id: number;
  customerId: number;
  orderDate: string;
  status: string;
  total: number;
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderInput {
  customerId: number;
  status: string;
  total: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  order?: Order;
  product?: Product;
}

export interface OrderItemInput {
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: boolean;
  error: {
    message: string;
    code: string;
  };
}
