import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { customersApi, productsApi, ordersApi, orderItemsApi } from '@/lib/api';
import type { Customer, Product, Order } from '@/lib/types';
import { Trash2, Edit, Plus, X } from 'lucide-react';

function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersRes, productsRes, ordersRes] = await Promise.all([
        customersApi.getAll(),
        productsApi.getAll(),
        ordersApi.getAll(),
      ]);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      toast({
        title: 'Error loading data',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const generateRandomCustomer = async () => {
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
    ];
    const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Spain', 'Italy', 'Japan'];
    const cities = ['New York', 'Toronto', 'London', 'Berlin', 'Paris', 'Madrid', 'Rome', 'Tokyo'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const countryIdx = Math.floor(Math.random() * countries.length);

    try {
      setLoading(true);
      await customersApi.create({
        name,
        email,
        country: countries[countryIdx],
        city: cities[countryIdx],
      });
      await loadData();
      toast({
        title: 'Customer created',
        description: `${name} has been added`,
      });
    } catch (error) {
      toast({
        title: 'Error creating customer',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomProduct = async () => {
    const products = [
      'Laptop',
      'Mouse',
      'Keyboard',
      'Monitor',
      'Headphones',
      'Webcam',
      'Desk',
      'Chair',
    ];
    const categories = [
      'Electronics',
      'Electronics',
      'Electronics',
      'Electronics',
      'Electronics',
      'Electronics',
      'Furniture',
      'Furniture',
    ];

    const idx = Math.floor(Math.random() * products.length);
    const name = products[idx];
    const category = categories[idx];
    const price = parseFloat((Math.random() * 1000 + 50).toFixed(2));

    try {
      setLoading(true);
      await productsApi.create({ name, category, price });
      await loadData();
      toast({
        title: 'Product created',
        description: `${name} has been added`,
      });
    } catch (error) {
      toast({
        title: 'Error creating product',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomOrder = async () => {
    if (customers.length === 0) {
      toast({
        title: 'No customers available',
        description: 'Create some customers first',
        variant: 'destructive',
      });
      return;
    }

    if (products.length === 0) {
      toast({
        title: 'No products available',
        description: 'Create some products first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Select random customer
      const customer = customers[Math.floor(Math.random() * customers.length)];

      // Select 1-3 random products
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      for (let i = 0; i < numItems; i++) {
        selectedProducts.push(products[Math.floor(Math.random() * products.length)]);
      }

      // Calculate total
      const total = selectedProducts.reduce(
        (sum, p) => sum + p.price * (Math.floor(Math.random() * 3) + 1),
        0
      );

      // Create order
      const statuses = ['pending', 'processing', 'completed', 'cancelled'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const orderRes = await ordersApi.create({
        customerId: customer.id,
        status,
        total: parseFloat(total.toFixed(2)),
      });

      // Create order items
      for (const product of selectedProducts) {
        const quantity = Math.floor(Math.random() * 3) + 1;
        await orderItemsApi.create({
          orderId: orderRes.data.id,
          productId: product.id,
          quantity,
          price: product.price,
        });
      }

      await loadData();
      toast({
        title: 'Order created',
        description: `Order #${orderRes.data.id} created for ${customer.name}`,
      });
    } catch (error) {
      console.log(error);
      toast({
        title: 'Error creating order',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (orderId: number) => {
    try {
      setLoading(true);
      await ordersApi.delete(orderId);
      await loadData();
      toast({
        title: 'Order deleted',
        description: `Order #${orderId} has been deleted`,
      });
    } catch (error) {
      toast({
        title: 'Error deleting order',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">OLTP Test Client</h1>
          <p className="text-gray-600">
            Test CDC pipeline by creating, modifying, and deleting orders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>Generate random customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateRandomCustomer} disabled={loading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Generate Random Customer
              </Button>
              <div className="text-sm text-gray-600">Total: {customers.length} customers</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Generate random products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateRandomProduct} disabled={loading} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Generate Random Product
              </Button>
              <div className="text-sm text-gray-600">Total: {products.length} products</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Create random orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generateRandomOrder}
                disabled={loading || customers.length === 0 || products.length === 0}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Generate Random Order
              </Button>
              <div className="text-sm text-gray-600">Total: {orders.length} orders</div>
            </CardContent>
          </Card>
        </div>

        {editingOrder && (
          <EditOrderCard
            order={editingOrder}
            customers={customers}
            onClose={() => setEditingOrder(null)}
            onSave={async (updatedOrder) => {
              try {
                setLoading(true);
                await ordersApi.update(updatedOrder.id, {
                  customerId: updatedOrder.customerId,
                  status: updatedOrder.status,
                  total: updatedOrder.total,
                });
                await loadData();
                setEditingOrder(null);
                toast({
                  title: 'Order updated',
                  description: `Order #${updatedOrder.id} has been updated`,
                });
              } catch (error) {
                toast({
                  title: 'Error updating order',
                  description: error instanceof Error ? error.message : 'Unknown error',
                  variant: 'destructive',
                });
              } finally {
                setLoading(false);
              }
            }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Orders List</CardTitle>
            <CardDescription>View and manage all orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No orders yet. Create some orders to get started!
                </p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">Order #{order.id}</h3>
                        <p className="text-sm text-gray-600">
                          Customer ID: {order.customerId} | Status: {order.status}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: ${Number(order.total).toFixed(2)} | Date:{' '}
                          {new Date(order.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingOrder(order)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteOrder(order.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-sm font-medium mb-1">Order Items:</p>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <p key={item.id} className="text-sm text-gray-600 pl-4">
                              Product #{item.productId} - Qty: {item.quantity} @ $
                              {item.price.toFixed(2)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}

interface EditOrderCardProps {
  order: Order;
  customers: Customer[];
  onClose: () => void;
  onSave: (order: Order) => void;
}

function EditOrderCard({ order, customers, onClose, onSave }: EditOrderCardProps) {
  const [customerId, setCustomerId] = useState(order.customerId.toString());
  const [status, setStatus] = useState(order.status);
  const [total, setTotal] = useState(order.total.toString());

  const handleSave = () => {
    onSave({
      ...order,
      customerId: parseInt(customerId),
      status,
      total: parseFloat(total),
    });
  };

  return (
    <Card className="border-blue-500">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Edit Order #{order.id}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name} ({customer.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <Input
            type="number"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default App;
