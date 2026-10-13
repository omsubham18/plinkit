import React, { useState, useRef } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  X,
  Camera,
  Image as ImageIcon,
  FolderTree,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { cropAndCompressImage, uploadProductImage } from '@/lib/imageProcessor';
import { upsertCategory, reorderCategories } from '@/lib/admin';
import type { CategoryRow } from '@/types/database';

export interface AdminCategoriesTabProps {
  categories: CategoryRow[];
  onRefreshCategories: () => Promise<void>;
}

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({
  categories,
  onRefreshCategories,
}) => {
  const { showToast } = useToast();

  const [editingCategory, setEditingCategory] = useState<Partial<CategoryRow> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenAddModal = () => {
    setEditingCategory({
      name: '',
      slug: '',
      image_url: '/categories/chips.webp',
      sort_order: categories.length + 1,
      is_active: true,
    });
    setImagePreview(null);
  };

  const handleOpenEditModal = (cat: CategoryRow) => {
    setEditingCategory({ ...cat });
    setImagePreview(cat.image_url);
  };

  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setEditingCategory((prev) =>
      prev
        ? {
            ...prev,
            name,
            slug: prev.id ? prev.slug : autoSlug, // Only auto-slug for new categories
          }
        : null
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageProcessing(true);
    try {
      const { blob, dataUrl, sizeBytes } = await cropAndCompressImage(file, {
        size: 600,
        maxBytes: 40 * 1024,
      });

      setImagePreview(dataUrl);
      const slug = editingCategory?.slug || 'cat';
      const url = await uploadProductImage(blob, `cat-${slug}.webp`, 'categories');
      setEditingCategory((prev) => (prev ? { ...prev, image_url: url } : null));

      showToast(`Category tile uploaded (${(sizeBytes / 1024).toFixed(1)} KB WebP)`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tile upload failed');
    } finally {
      setImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    if (!editingCategory.name?.trim() || !editingCategory.slug?.trim()) {
      showToast('Name and Slug are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertCategory(editingCategory);
      if (res.success) {
        showToast(`Category "${res.category?.name}" saved`);
        setEditingCategory(null);
        await onRefreshCategories();
      } else {
        showToast(res.error || 'Failed to save category');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const orderedIds = list.map((c) => c.id);
    const res = await reorderCategories(orderedIds);
    if (res.success) {
      await onRefreshCategories();
      showToast('Category order updated');
    } else {
      showToast(res.error || 'Failed to reorder categories');
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="type-title font-bold text-ink flex items-center gap-2">
            <FolderTree size={20} className="text-brand" />
            <span>Store Categories ({categories.length})</span>
          </h2>
          <p className="type-caption text-ink-2">
            Add, edit, reorder category tiles, and upload illustrations.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenAddModal}
          className="h-11 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add category</span>
        </Button>
      </div>

      {/* Category List with Reorder Controls */}
      <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-xs">
        {categories.map((cat, idx) => (
          <div
            key={cat.id}
            className={`p-4 flex items-center justify-between gap-3 transition-colors ${
              !cat.is_active ? 'bg-canvas/40 opacity-70' : 'hover:bg-canvas/30'
            }`}
          >
            {/* Left: Reorder buttons, Thumbnail, Name, Slug */}
            <div className="flex items-center gap-3">
              {/* Up / Down Controls */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  title="Move Up"
                  className="w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center text-ink-2 disabled:opacity-30 disabled:pointer-events-none hover:bg-canvas active:scale-95"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === categories.length - 1}
                  title="Move Down"
                  className="w-7 h-7 rounded-lg border border-line bg-surface flex items-center justify-center text-ink-2 disabled:opacity-30 disabled:pointer-events-none hover:bg-canvas active:scale-95"
                >
                  <ArrowDown size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Order number */}
              <span className="type-caption text-ink-3 font-bold tabular-nums w-5 text-center">
                #{idx + 1}
              </span>

              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-xl border border-line bg-canvas overflow-hidden shrink-0 flex items-center justify-center">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon size={18} className="text-ink-3" />
                )}
              </div>

              {/* Info */}
              <div>
                <h3 className="type-subtitle font-bold text-ink">{cat.name}</h3>
                <span className="type-caption text-ink-2 font-mono">/c/{cat.slug}</span>
              </div>
            </div>

            {/* Right: Active status & Edit */}
            <div className="flex items-center gap-3">
              <span
                className={`type-caption px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  cat.is_active
                    ? 'bg-emerald-50 text-success border border-emerald-200'
                    : 'bg-slate-100 text-ink-3 border border-slate-200'
                }`}
              >
                {cat.is_active ? 'Active' : 'Inactive'}
              </span>

              <Button
                variant="secondary"
                onClick={() => handleOpenEditModal(cat)}
                className="h-9 px-3 text-xs font-bold flex items-center gap-1"
              >
                <Edit2 size={13} strokeWidth={2} />
                <span>Edit</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-line max-w-md w-full p-6 shadow-floating space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="type-title font-bold text-ink">
                {editingCategory.id ? `Edit ${editingCategory.name}` : 'Add Category'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Tile Image Upload */}
              <div className="p-3.5 rounded-xl border border-line bg-canvas flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-line bg-surface overflow-hidden shrink-0 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Tile preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon size={24} className="text-ink-3" />
                  )}
                </div>

                <div className="space-y-1">
                  <span className="type-caption font-bold text-ink block">Tile illustration</span>
                  <label className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-canvas text-xs font-bold text-ink inline-flex items-center gap-1 cursor-pointer shadow-xs">
                    <Camera size={13} />
                    <span>Upload tile photo</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imageProcessing && <span className="text-xs text-brand block">Optimizing...</span>}
                </div>
              </div>

              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Snacks & Munchies"
                  className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="type-caption font-semibold text-ink-2 block mb-1">
                  URL Slug (Unique) *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  placeholder="e.g. snacks"
                  className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-is-active"
                  checked={editingCategory.is_active ?? true}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-brand rounded"
                />
                <label htmlFor="cat-is-active" className="text-sm font-semibold text-ink">
                  Category is active and visible in navigation
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
