import React, { createContext, useContext, useState } from 'react';

interface Order {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: string;
  timestamp: string;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'timestamp'>) => void;
  clearOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  const addOrder = (orderData: Omit<Order, 'id' | 'timestamp'>) => {
    const newOrder: Order = {
      ...orderData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setOrders(prev => [newOrder, ...prev]);
  };

  const clearOrders = () => setOrders([]);

  return (
    <OrderContext.Provider value={{ orders, addOrder, clearOrders }}>
      {children}
    </OrderContext.Provider>
  );
};