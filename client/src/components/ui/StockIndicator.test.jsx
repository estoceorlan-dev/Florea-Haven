import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StockIndicator } from './StockIndicator.jsx';

describe('StockIndicator', () => {
  it.each([
    [0, 'Out of stock', 'unavailable'],
    [1, 'Only 1 left', 'low'],
    [5, 'Only 5 left', 'low'],
    [6, '6 in stock', 'available'],
  ])('renders stock quantity %s as %s', (quantity, label, state) => {
    render(<StockIndicator stockQuantity={quantity} />);

    expect(screen.getByText(label).closest('p')).toHaveAttribute(
      'data-stock-state',
      state,
    );
  });

  it('warns when the requested quantity exceeds current stock', () => {
    render(<StockIndicator stockQuantity={3} requestedQuantity={4} />);

    expect(screen.getByText('Only 3 available').closest('p')).toHaveAttribute(
      'data-stock-state',
      'unavailable',
    );
  });

  it('keeps the current value visible while stock refreshes', () => {
    render(<StockIndicator stockQuantity={9} isUpdating />);

    expect(screen.getByText('9 in stock')).toBeInTheDocument();
    expect(screen.getByText('Updating…')).toBeInTheDocument();
  });
});
