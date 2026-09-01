import { LoaderCircle, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminCatalogApi } from '../services/api.js';

const emptyCategory = { name: '', slug: '', description: '' };

function CategoryForm({ category, onCancel, onSubmit }) {
  const [values, setValues] = useState(() =>
    category
      ? {
          name: category.name,
          slug: category.slug,
          description: category.description,
        }
      : emptyCategory,
  );
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateValue = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (values.name.trim().length < 2) {
      setFormError('Category name must contain at least 2 characters.');
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name: values.name,
        slug: values.slug,
        description: values.description,
      });
      if (!category) setValues(emptyCategory);
    } catch {
      // The page-level alert contains the API error.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      className="border border-evergreen/10 bg-surface p-6 sm:p-7"
      onSubmit={submit}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-clay">
            {category ? 'Edit category' : 'New category'}
          </p>
          <h2 className="mt-2 font-display text-3xl text-evergreen">
            {category ? category.name : 'Add a collection'}
          </h2>
        </div>
        {category && (
          <button
            className="icon-button -mr-2 -mt-2"
            type="button"
            aria-label="Cancel category editing"
            onClick={onCancel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5">
        <label className="form-field">
          Category name
          <input
            className="form-input"
            name="name"
            value={values.name}
            maxLength={80}
            required
            onChange={updateValue}
          />
        </label>
        <label className="form-field">
          Slug
          <input
            className="form-input"
            name="slug"
            value={values.slug}
            maxLength={60}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="Generated from the name"
            onChange={updateValue}
          />
          <span className="form-hint">
            Lowercase letters, numbers, and hyphens. Leave blank to generate it.
          </span>
        </label>
        <label className="form-field">
          Description
          <textarea
            className="form-input min-h-28 resize-y"
            name="description"
            value={values.description}
            maxLength={1000}
            onChange={updateValue}
          />
        </label>
      </div>

      {formError && (
        <p className="form-alert mt-5" role="alert">
          {formError}
        </p>
      )}

      <button className="button-primary mt-6 w-full" type="submit" disabled={isSaving}>
        {isSaving ? (
          <LoaderCircle className="animate-spin" size={15} aria-hidden="true" />
        ) : (
          <Plus size={15} aria-hidden="true" />
        )}
        {category ? 'Save category' : 'Create category'}
      </button>
    </form>
  );
}

export function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await adminCatalogApi.getCategories();
      setCategories(payload.data);
      setError(null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    adminCatalogApi
      .getCategories()
      .then((payload) => {
        if (!isCurrent) return;
        setCategories(payload.data);
        setError(null);
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const saveCategory = async (input) => {
    setNotice('');
    try {
      const payload = editing
        ? await adminCatalogApi.updateCategory(editing.id, input)
        : await adminCatalogApi.createCategory(input);
      setNotice(
        editing
          ? `${payload.data.name} was updated.`
          : `${payload.data.name} was created.`,
      );
      setEditing(null);
      await loadCategories();
    } catch (saveError) {
      setError(saveError);
      throw saveError;
    }
  };

  const removeCategory = async (category) => {
    const confirmed = window.confirm(
      `Delete “${category.name}”? This is only allowed when no products reference it.`,
    );
    if (!confirmed) return;

    setNotice('');
    try {
      await adminCatalogApi.deleteCategory(category.id);
      if (editing?.id === category.id) setEditing(null);
      setNotice(`${category.name} was deleted.`);
      await loadCategories();
    } catch (deleteError) {
      setError(deleteError);
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-evergreen/10 pb-7">
        <div>
          <p className="eyebrow text-clay">Catalog structure</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em] text-evergreen">
            Categories
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
            Organize customer-facing collections. Categories referenced by products stay
            protected from deletion.
          </p>
        </div>
        <div className="flex items-center gap-3 border border-evergreen/10 bg-surface px-4 py-3">
          <Tags className="text-leaf" size={19} aria-hidden="true" />
          <span className="text-sm font-bold text-evergreen">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
        </div>
      </div>

      {notice && (
        <p
          className="mt-6 border border-evergreen/15 bg-surface px-4 py-3 text-sm text-evergreen"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          className="form-alert mt-6 flex items-start justify-between gap-4"
          role="alert"
        >
          <span>{error.message}</span>
          <button
            type="button"
            className="text-link shrink-0"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="border border-evergreen/10 bg-surface">
          <div className="border-b border-evergreen/10 px-5 py-4">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-evergreen">
              Current collections
            </h2>
          </div>
          {isLoading ? (
            <div className="grid min-h-56 place-items-center" role="status">
              <LoaderCircle className="animate-spin text-leaf" aria-hidden="true" />
              <span className="sr-only">Loading categories</span>
            </div>
          ) : categories.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink/55">No categories yet.</p>
          ) : (
            <ul className="divide-y divide-evergreen/10">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-2xl text-evergreen">
                        {category.name}
                      </h3>
                      <span className="rounded-full bg-sage px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-evergreen">
                        {category.active_product_count} active /{' '}
                        {category.product_count} total
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-clay">
                      /{category.slug}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">
                      {category.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="icon-button border border-evergreen/10"
                      type="button"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => setEditing(category)}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button border border-clay/15 text-clay"
                      type="button"
                      aria-label={`Delete ${category.name}`}
                      onClick={() => removeCategory(category)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:sticky lg:top-44">
          <CategoryForm
            key={editing?.id ?? 'new-category'}
            category={editing}
            onCancel={() => setEditing(null)}
            onSubmit={saveCategory}
          />
        </div>
      </div>
    </section>
  );
}
