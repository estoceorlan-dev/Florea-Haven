import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProductCard } from './ProductCard.jsx';

const product = {
  id: '20000000-0000-4000-8000-000000000001',
  name: 'Blush Garden Bouquet',
  price: 1890,
  image_url: null,
  featured: true,
  category: { name: 'Flowers', slug: 'flowers' },
};

describe('ProductCard', () => {
  it('renders catalog information and a detail link', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Blush Garden Bouquet')).toBeInTheDocument();
    expect(screen.getByText('₱1,890')).toBeInTheDocument();
    expect(screen.getByText('Haven favorite')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View Blush Garden Bouquet' }),
    ).toHaveAttribute('href', `/products/${product.id}`);
  });
});
