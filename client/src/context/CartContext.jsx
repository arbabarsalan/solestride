import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The cart lives entirely on the client until checkout: each line keeps the
// product snapshot it was added with, so prices stay stable while shopping.
const CartContext = createContext(null);
const STORAGE_KEY = "solestride.cart.v1";

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.qty, 0),
      addItem(product, size, qty = 1) {
        setItems((prev) => {
          const key = `${product.product_id ?? product.id}:${size}`;
          const existing = prev.find((i) => `${i.product_id}:${i.size}` === key);
          if (existing) {
            return prev.map((i) =>
              `${i.product_id}:${i.size}` === key
                ? { ...i, qty: Math.min(i.qty + qty, product.stock) }
                : i
            );
          }
          return [
            ...prev,
            {
              product_id: product.product_id ?? product.id,
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              image_url: product.image_url,
              price_cents: product.price_cents,
              size,
              qty,
            },
          ];
        });
      },
      removeItem(productId, size) {
        setItems((prev) =>
          prev.filter((i) => !(i.product_id === productId && i.size === size))
        );
      },
      updateQty(productId, size, qty) {
        if (qty <= 0) return this.removeItem(productId, size);
        setItems((prev) =>
          prev.map((i) =>
            i.product_id === productId && i.size === size ? { ...i, qty } : i
          )
        );
      },
      clear() {
        setItems([]);
      },
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
