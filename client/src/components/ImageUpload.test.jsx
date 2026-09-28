import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageApi } from '../services/api.js';
import { ImageUpload } from './ImageUpload.jsx';
import { ProductImage } from './ProductImage.jsx';

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('managed image controls', () => {
  it('rejects unsupported files without calling the API', () => {
    const upload = vi.spyOn(imageApi, 'upload');
    render(
      <ImageUpload
        endpoint="/api/users/me/profile-image"
        label="Profile picture"
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Choose profile picture'), {
      target: { files: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('5 MB or smaller');
    expect(screen.getByRole('button', { name: 'Upload image' })).toBeDisabled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('preserves selection after a failure and supports retry, progress, and removal', async () => {
    const saved = vi.fn();
    const upload = vi
      .spyOn(imageApi, 'upload')
      .mockRejectedValueOnce(new Error('Provider unavailable'));
    render(
      <ImageUpload
        endpoint="/api/users/me/profile-image"
        src="https://example.com/old.jpg"
        label="Profile picture"
        onSaved={saved}
      />,
    );
    fireEvent.change(screen.getByLabelText('Choose profile picture'), {
      target: { files: [new File(['png'], 'x.png', { type: 'image/png' })] },
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable');
    let resolve;
    upload.mockImplementationOnce((endpoint, file, progress) => {
      progress(50);
      return new Promise((done) => {
        resolve = done;
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload image' }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '50');
    resolve({ data: { user: { profile_image_url: 'new.webp' } } });
    expect(await screen.findByText('Image saved.')).toBeInTheDocument();
    expect(saved).toHaveBeenCalledTimes(1);
    vi.spyOn(imageApi, 'remove').mockResolvedValue({
      data: { user: { profile_image_url: null } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));
    expect(await screen.findByText('Image removed.')).toBeInTheDocument();
    await waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview'),
    );
  });

  it('recovers a failed product image when its URL changes', () => {
    const { rerender } = render(<ProductImage src="broken.jpg" alt="Rose" />);
    fireEvent.error(screen.getByRole('img'));
    expect(
      screen.getByRole('img', { name: 'Rose image unavailable' }),
    ).toBeInTheDocument();
    rerender(<ProductImage src="working.jpg" alt="Rose" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'working.jpg');
  });
});
