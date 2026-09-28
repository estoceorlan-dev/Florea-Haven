import { AuthContext } from '../context/AuthContext.js';
import { CartContext } from '../context/CartContext.js';
import { AppQueryProvider } from '../queries/AppQueryProvider.jsx';

const emptyCart = {
  items: [],
  revision: null,
  summary: {
    item_count: 0,
    distinct_items: 0,
    subtotal: 0,
    has_unavailable_items: false,
  },
};

export function TestAppProviders({
  authActions = {},
  children,
  user = null,
  cart = emptyCart,
  cartActions = {},
  queryClient,
}) {
  return (
    <AppQueryProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: Boolean(user),
          isLoading: false,
          sessionError: null,
          register: async () => undefined,
          login: async () => undefined,
          logout: async () => undefined,
          ...authActions,
        }}
      >
        <CartContext.Provider
          value={{
            cart,
            error: null,
            refreshError: null,
            isLoading: false,
            isRefreshing: false,
            lastUpdated: 1,
            addItem: async () => cart,
            updateItem: async () => cart,
            removeItem: async () => cart,
            reload: async () => cart,
            setCart: () => cart,
            setCheckoutRefreshEnabled: () => undefined,
            ...cartActions,
          }}
        >
          {children}
        </CartContext.Provider>
      </AuthContext.Provider>
    </AppQueryProvider>
  );
}
