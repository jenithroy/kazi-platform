'use client';

import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import type { Product, ProductColor } from '@/lib/products';
import { getPriceForQty } from '@/lib/products';

export interface CartItem {
  product: Product;
  quantity: number;
  color: ProductColor;
  size: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { productId: string; color: string; size: string } }
  | { type: 'UPDATE_QTY'; payload: { productId: string; color: string; size: string; quantity: number } }
  | { type: 'CLEAR' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'HYDRATE'; payload: CartItem[] };

function cartKey(item: Pick<CartItem, 'product' | 'color' | 'size'>) {
  return `${item.product.id}__${item.color.name}__${item.size}`;
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.payload };
    case 'ADD_ITEM': {
      const key = cartKey(action.payload);
      const existing = state.items.find(i => cartKey(i) === key);
      if (existing) {
        return {
          ...state,
          isOpen: true,
          items: state.items.map(i =>
            cartKey(i) === key ? { ...i, quantity: i.quantity + action.payload.quantity } : i
          ),
        };
      }
      return { ...state, isOpen: true, items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM': {
      const key = `${action.payload.productId}__${action.payload.color}__${action.payload.size}`;
      return { ...state, items: state.items.filter(i => cartKey(i) !== key) };
    }
    case 'UPDATE_QTY': {
      const key = `${action.payload.productId}__${action.payload.color}__${action.payload.size}`;
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(i => cartKey(i) !== key) };
      }
      return {
        ...state,
        items: state.items.map(i => cartKey(i) === key ? { ...i, quantity: action.payload.quantity } : i),
      };
    }
    case 'CLEAR':
      return { ...state, items: [] };
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  updateQty: (productId: string, color: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], isOpen: false });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('kazi-cart');
      if (stored) {
        dispatch({ type: 'HYDRATE', payload: JSON.parse(stored) });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('kazi-cart', JSON.stringify(state.items));
    }
  }, [state.items, hydrated]);

  const totalItems = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = state.items.reduce((sum, i) => sum + getPriceForQty(i.product, i.quantity) * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen: state.isOpen,
      openCart: () => dispatch({ type: 'OPEN' }),
      closeCart: () => dispatch({ type: 'CLOSE' }),
      addItem: (item) => dispatch({ type: 'ADD_ITEM', payload: item }),
      removeItem: (productId, color, size) => dispatch({ type: 'REMOVE_ITEM', payload: { productId, color, size } }),
      updateQty: (productId, color, size, quantity) => dispatch({ type: 'UPDATE_QTY', payload: { productId, color, size, quantity } }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      totalItems,
      totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
