import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { queryKeys } from '../queries/queryKeys.js';
import { emptyCart, useCartQuery } from '../queries/useCartQuery.js';
import { cartApi } from '../services/api.js';
import { CartContext } from './CartContext.js';

export function CartProvider({ children }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const previousOwnerId = useRef(null);
  const [checkoutRefreshEnabled, setCheckoutRefreshEnabled] = useState(false);
  const cartQuery = useCartQuery(userId, {
    refetchInterval: checkoutRefreshEnabled ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
  const refetchCart = cartQuery.refetch;

  useEffect(() => {
    const priorOwnerId = previousOwnerId.current;
    if (priorOwnerId && priorOwnerId !== userId) {
      void queryClient.cancelQueries({ queryKey: queryKeys.user(priorOwnerId) });
      queryClient.removeQueries({ queryKey: queryKeys.user(priorOwnerId) });
    }
    previousOwnerId.current = userId ?? null;
  }, [queryClient, userId]);

  const setCart = useCallback(
    (cart) => {
      if (userId) queryClient.setQueryData(queryKeys.cart(userId), cart);
      return cart;
    },
    [queryClient, userId],
  );

  const refreshCatalog = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
    [queryClient],
  );

  const applyCartResponse = useCallback(
    (payload) => setCart(payload.data.cart),
    [setCart],
  );

  const runMutation = useCallback(
    async (mutation) => {
      try {
        return applyCartResponse(await mutation());
      } catch (error) {
        if (userId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) });
        }
        throw error;
      } finally {
        void refreshCatalog();
      }
    },
    [applyCartResponse, queryClient, refreshCatalog, userId],
  );

  const addItem = useCallback(
    (productId, quantity = 1) =>
      runMutation(() => cartApi.addItem(productId, quantity)),
    [runMutation],
  );
  const updateItem = useCallback(
    (itemId, quantity) => runMutation(() => cartApi.updateItem(itemId, quantity)),
    [runMutation],
  );
  const removeItem = useCallback(
    (itemId) => runMutation(() => cartApi.removeItem(itemId)),
    [runMutation],
  );
  const reload = useCallback(async () => {
    if (!userId) return emptyCart;
    const result = await refetchCart({ cancelRefetch: true });
    if (result.error) throw result.error;
    return result.data;
  }, [refetchCart, userId]);

  const cart = user ? (cartQuery.data ?? emptyCart) : emptyCart;
  const hasResolvedCart = Boolean(cartQuery.data);
  const value = useMemo(
    () => ({
      cart,
      error: hasResolvedCart ? null : cartQuery.error,
      refreshError: hasResolvedCart ? cartQuery.error : null,
      isLoading: !isAuthLoading && Boolean(user) && cartQuery.isPending,
      isRefreshing: hasResolvedCart && cartQuery.isFetching,
      lastUpdated: cartQuery.dataUpdatedAt || null,
      addItem,
      updateItem,
      removeItem,
      reload,
      setCart,
      setCheckoutRefreshEnabled,
    }),
    [
      addItem,
      cart,
      cartQuery.dataUpdatedAt,
      cartQuery.error,
      cartQuery.isFetching,
      cartQuery.isPending,
      hasResolvedCart,
      isAuthLoading,
      reload,
      removeItem,
      setCart,
      setCheckoutRefreshEnabled,
      updateItem,
      user,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
