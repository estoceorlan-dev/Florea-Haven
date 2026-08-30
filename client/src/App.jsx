import { Route, Routes } from 'react-router-dom';
import { StorefrontLayout } from './components/StorefrontLayout.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProductDetailsPage } from './pages/ProductDetailsPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
