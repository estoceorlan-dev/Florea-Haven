import { useEffect, useId, useState } from 'react';
import { imageApi } from '../services/api.js';
import { ProductImage } from './ProductImage.jsx';

export function ImageUpload({ endpoint, src, label, onSaved }) {
  const id = useId();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const choose = (event) => {
    const selected = event.target.files?.[0];
    setError('');
    setNotice('');
    if (!selected) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setError('Choose a JPEG, PNG, or WebP image, 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const save = async (remove = false) => {
    setBusy(true);
    setProgress(0);
    setError('');
    setNotice('');
    try {
      const result = remove
        ? await imageApi.remove(endpoint)
        : await imageApi.upload(endpoint, file, setProgress);
      onSaved(result);
      setFile(null);
      setPreview('');
      setNotice(remove ? 'Image removed.' : 'Image saved.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-card border border-border p-4" aria-busy={busy}>
      <p className="mb-3 text-sm font-semibold text-text">{label}</p>
      <ProductImage
        src={preview || src}
        alt={label}
        className="mb-4 size-28 rounded-xl object-cover"
      />
      <label className="form-field" htmlFor={id}>
        Choose {label.toLowerCase()}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="my-2 block w-full text-sm"
        onChange={choose}
        disabled={busy}
      />
      <p className="form-hint">
        JPEG, PNG, or WebP. Up to 5 MB and 4096 × 4096 pixels. No animation.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="button-secondary"
          disabled={!file || busy}
          onClick={() => save()}
        >
          {busy ? 'Saving…' : 'Upload image'}
        </button>
        {src && (
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => save(true)}
          >
            Remove image
          </button>
        )}
        {file && (
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setPreview('');
            }}
          >
            Cancel selection
          </button>
        )}
      </div>
      {busy && (
        <div className="mt-3" role="status">
          <progress
            aria-label="Image upload progress"
            max="100"
            value={progress}
            className="w-full"
          />
          <p className="text-sm">
            {progress < 100 ? `Uploading: ${progress}%` : 'Processing image…'}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-text-muted">
          {notice}
        </p>
      )}
    </div>
  );
}
