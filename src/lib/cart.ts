import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Unique ID for the cart item (product + addons combination)
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  addons: { id: string; name: string; price: number }[];
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      addItem: (newItem) => {
        const items = get().items;
        
        // Generate a unique signature for the item based on product and addons
        const newItemSignature = JSON.stringify({
          p: newItem.productId,
          a: newItem.addons.sort((a, b) => a.id.localeCompare(b.id)).map(a => a.id),
          n: newItem.notes
        });

        const existingItem = items.find((i) => {
          const signature = JSON.stringify({
            p: i.productId,
            a: i.addons.sort((a, b) => a.id.localeCompare(b.id)).map(a => a.id),
            n: i.notes
          });
          return signature === newItemSignature;
        });
        
        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === existingItem.id
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
            isCartOpen: true,
          });
        } else {
          set({ 
            items: [...items, { ...newItem, id: Math.random().toString(36).substring(7) }],
            isCartOpen: true,
          });
        }
      },
      removeItem: (itemId) => {
        set({ items: get().items.filter((i) => i.id !== itemId) });
      },
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((acc, item) => {
        const addonsTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);
        return acc + (item.price + addonsTotal) * item.quantity;
      }, 0),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
    }),
    {
      name: 'rox-delivery-cart',
      partialize: (state) => ({ items: state.items }), // Don't persist isCartOpen
    }
  )
);
