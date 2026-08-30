import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { cartApi } from '../services/api.js';
import { CartContext } from './CartContext.js';

const emptyCart = {
  items: [],
  summary: {
    item_count: 0,
    distinct_items: 0,
    subtotal: 0,
    has_unavailable_items: false,
  },
};

export function CartProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [snapshot, setSnapshot] = useState({
    ownerId: null,
    cart: emptyCart,
    error: null,
  });

  const loadCart = useCallback(async () => {
    if (!user) return emptyCart;

    try {
      const payload = await cartApi.getCart();
      setSnapshot({ ownerId: user.id, cart: payload.data.cart, error: null });
      return payload.data.cart;
    } catch (error) {
      setSnapshot({ ownerId: user.id, cart: emptyCart, error });
      throw error;
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      // Synchronize the authenticated owner with their server-backed cart.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCart().catch(() => undefined);
    }
  }, [isAuthLoading, loadCart, user]);

  const applyCartResponse = useCallback(
    (payload) => {
      const cart = payload.data.cart;
      setSnapshot({ ownerId: user.id, cart, error: null });
      return cart;
    },
    [user],
  );

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      const payload = await cartApi.addItem(productId, quantity);
      return applyCartResponse(payload);
    },
    [applyCartResponse],
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      const payload = await cartApi.updateItem(itemId, quantity);
      return applyCartResponse(payload);
    },
    [applyCartResponse],
  );

  const removeItem = useCallback(
    async (itemId) => {
      const payload = await cartApi.removeItem(itemId);
      return applyCartResponse(payload);
    },
    [applyCartResponse],
  );

  const belongsToCurrentUser = Boolean(user) && snapshot.ownerId === user.id;
  const cart = belongsToCurrentUser ? snapshot.cart : emptyCart;
  const error = belongsToCurrentUser ? snapshot.error : null;
  const isLoading = !isAuthLoading && Boolean(user) && snapshot.ownerId !== user.id;

  const value = useMemo(
    () => ({
      cart,
      error,
      isLoading,
      addItem,
      updateItem,
      removeItem,
      reload: loadCart,
    }),
    [addItem, cart, error, isLoading, loadCart, removeItem, updateItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
