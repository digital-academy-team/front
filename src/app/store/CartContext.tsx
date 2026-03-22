import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '@/app/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (courseId: string) => void;
  clearCart: () => void;
  isInCart: (courseId: string) => boolean;
  total: number;
}

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'digital_academy_cart';

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => prev.find(i => i.courseId === item.courseId) ? prev : [...prev, item]);
  };

  const removeFromCart = (courseId: string) => {
    setItems(prev => prev.filter(i => i.courseId !== courseId));
  };

  const clearCart = () => setItems([]);
  const isInCart = (courseId: string) => items.some(i => i.courseId === courseId);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, isInCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
