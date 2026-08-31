import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout.jsx';
import { AdminRoute, ProtectedRoute } from './components/RouteGuards.jsx';
import { StorefrontLayout } from './components/StorefrontLayout.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage.jsx';
import { AdminHomePage } from './pages/AdminHomePage.jsx';
import { AdminOrderDetailPage } from './pages/AdminOrderDetailPage.jsx';
import { AdminOrdersPage } from './pages/AdminOrdersPage.jsx';
import { AdminProductsPage } from './pages/AdminProductsPage.jsx';
import { CartPage } from './pages/CartPage.jsx';
import { CheckoutPage } from './pages/CheckoutPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.jsx';
import { OrderDetailPage } from './pages/OrderDetailPage.jsx';
import { OrdersPage } from './pages/OrdersPage.jsx';
import { ProductDetailsPage } from './pages/ProductDetailsPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="account" element={<AccountPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:orderId" element={<OrderDetailPage />} />
          <Route
            path="orders/:orderId/confirmation"
            element={<OrderConfirmationPage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
