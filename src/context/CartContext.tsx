"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "~/lib/supabase";
import { calculateDiscountedPrice } from "~/lib/supabase";

export interface SelectedModifier {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  priceAdjustment: number;
}

export interface CartItem extends Product {
  quantity: number;
  selectedModifiers?: SelectedModifier[];
  cartItemId: string; // Unique ID for this specific cart item configuration
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, selectedModifiers?: SelectedModifier[]) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "symphony_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart) as CartItem[];
        setCart(parsedCart);
      } catch (error) {
        console.error("Failed to parse saved cart:", error);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage whenever it changes (after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  const addToCart = (product: Product, selectedModifiers?: SelectedModifier[]) => {
    setCart((currentCart) => {
      // Create a unique cart item ID based on product ID and modifiers
      const modifierKey = selectedModifiers
        ?.map(m => `${m.groupId}:${m.optionId}`)
        .sort()
        .join('|') ?? '';
      const cartItemId = `${product.id}_${modifierKey}_${Date.now()}`;

      // Check if exact same configuration exists
      const existingItem = currentCart.find((item) => {
        if (item.id !== product.id) return false;
        const itemModifierKey = item.selectedModifiers
          ?.map(m => `${m.groupId}:${m.optionId}`)
          .sort()
          .join('|') ?? '';
        return itemModifierKey === modifierKey;
      });

      if (existingItem) {
        return currentCart.map((item) =>
          item.cartItemId === existingItem.cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1, selectedModifiers, cartItemId }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const basePrice = calculateDiscountedPrice(item.price, item.discount);
      const modifiersPrice = item.selectedModifiers?.reduce(
        (sum, mod) => sum + mod.priceAdjustment,
        0
      ) ?? 0;
      return total + (basePrice + modifiersPrice) * item.quantity;
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
