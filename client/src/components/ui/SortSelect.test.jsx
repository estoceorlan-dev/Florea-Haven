import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SortSelect } from './SortSelect.jsx';

const options = [
  ['featured', 'Featured'],
  ['newest', 'Newest arrivals'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name-asc', 'Name: A–Z'],
];

function Example({ onChange = () => {} }) {
  const [value, setValue] = useState('featured');
  return (
    <>
      <SortSelect
        options={options}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
      <button type="button">Next control</button>
    </>
  );
}

describe('SortSelect', () => {
  it('selects an option and keeps focus on the updated trigger', () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Sort products' });
    fireEvent.click(trigger);
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'Featured',
    );
    fireEvent.click(screen.getByRole('option', { name: 'Price: low to high' }));
    expect(onChange).toHaveBeenCalledWith('price-asc');
    expect(trigger).toHaveTextContent('Price: low to high');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'Price: low to high',
    );
  });

  it('supports arrows, Home/End, Enter and Escape without changing a cancelled selection', () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Newest arrivals' }).id,
    );
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'End' });
    fireEvent.keyDown(trigger, { key: 'Home' });
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('name-asc');
    expect(trigger).toHaveTextContent('Name: A–Z');
  });

  it('finds options by typing and commits the highlighted value on Tab', () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'p' });
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Price: low to high' }).id,
    );
    fireEvent.keyDown(trigger, { key: 'p' });
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Price: high to low' }).id,
    );
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledWith('price-desc');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('dismisses on outside interaction or blur without selecting an option', () => {
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Next control' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.blur(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
