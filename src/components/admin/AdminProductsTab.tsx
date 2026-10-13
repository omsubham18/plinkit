import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Image as ImageIcon,
  Camera,
  X,
  Edit2,
  EyeOff,
  Eye,
  Layers,
} from 'lucide-react';
import { PriceTag } from '@/components/common/PriceTag';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { cropAndCompressImage, uploadProductImage } from '@/lib/imageProcessor';
import { validateCatalogCsv, exportProductsToCsv, downloadCsv, type CsvValidationError, type ParsedCatalogRow } from '@/lib/csvUtils';
import {
  upsertProduct,
  deactivateProduct,
  bulkUpsertProducts,
} from '@/lib/admin';
import type { ProductRow, CategoryRow, ProductRail } from '@/types/database';

export interface AdminProductsTabProps {
  products: ProductRow[];
  categories: CategoryRow[];
  onRefreshProducts: () => Promise<void>;
}

export const AdminProductsTab: React.FC<AdminProductsTabProps> = ({
  products,
  categories,
  onRefreshProducts,
}) => {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Partial<ProductRow> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // In-browser image processing state
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageSizeLabel, setImageSizeLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // CSV Import state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<ParsedCatalogRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<CsvValidationError[]>([]);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk photos state
  const [isBulkPhotosModalOpen, setIsBulkPhotosModalOpen] = useState(false);
  const [bulkPhotoProgress, setBulkPhotoProgress] = useState<string | null>(null);
  const bulkPhotosInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesSub = p.subcategory?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesSku && !matchesBrand && !matchesSub) return false;
      }
      return true;
    });
  }, [products, statusFilter, selectedCategory, searchQuery]);

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setEditingProduct({
      sku: '',
      name: '',
      brand: '',
      category_id: categories[0]?.id || '',
      subcategory: '',
      size_label: '',
      mrp: 50,
      price: 45,
      stock_qty: 20,
      max_per_order: 5,
      keywords: [],
      description: '',
      manufacturer: '',
      country_of_origin: 'India',
      rail: null,
      is_active: true,
      image_url: null,
    });
    setImagePreview(null);
    setImageSizeLabel(null);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (product: ProductRow) => {
    setEditingProduct({ ...product });
    setImagePreview(product.image_url || null);
    setImageSizeLabel(product.image_url ? 'Existing image' : null);
  };

  // Handle Photo Picker & In-Browser Crop/Compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageProcessing(true);
    try {
      const { blob, dataUrl, sizeBytes } = await cropAndCompressImage(file, {
        size: 600,
        maxBytes: 40 * 1024,
      });

      setImagePreview(dataUrl);
      const kb = (sizeBytes / 1024).toFixed(1);
      setImageSizeLabel(`${kb} KB WebP (600×600)`);

      // Upload to Supabase Storage with long-lived cache header
      const skuTag = editingProduct?.sku || 'prod';
      const uploadedUrl = await uploadProductImage(blob, `${skuTag}-${file.name}`);
      setEditingProduct((prev) => (prev ? { ...prev, image_url: uploadedUrl } : null));

      showToast(`Photo cropped & optimized (${kb} KB WebP)`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image processing failed');
    } finally {
      setImageProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save Add/Edit Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editingProduct.sku?.trim() || !editingProduct.name?.trim()) {
      showToast('SKU and Product Name are required');
      return;
    }

    if (
      editingProduct.price === undefined ||
      editingProduct.mrp === undefined ||
      editingProduct.price > editingProduct.mrp
    ) {
      showToast('Price cannot exceed MRP');
      return;
    }

    setIsSavingProduct(true);
    try {
      const res = await upsertProduct(editingProduct);
      if (res.success) {
        showToast(`Product "${res.product?.name}" saved`);
        setEditingProduct(null);
        await onRefreshProducts();
      } else {
        showToast(res.error || 'Failed to save product');
      }
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Toggle Deactivation instead of Deletion
  const handleToggleDeactivate = async (product: ProductRow) => {
    const nextState = !product.is_active;
    const actionLabel = nextState ? 'Reactivate' : 'Deactivate';

    const confirmed = window.confirm(
      `${actionLabel} "${product.name}"? ${
        !nextState ? 'Customers will no longer see this product in store rails or search.' : ''
      }`
    );
    if (!confirmed) return;

    const res = await deactivateProduct(product.id, nextState);
    if (res.success) {
      showToast(`Product ${nextState ? 'reactivated' : 'deactivated'}`);
      await onRefreshProducts();
    } else {
      showToast(res.error || 'Failed to change product status');
    }
  };

  // CSV Import: Handle File Selection
  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { validRows, errors } = validateCatalogCsv(text, categories);
      setCsvPreviewRows(validRows);
      setCsvErrors(errors);
      setIsCsvModalOpen(true);
    };
    reader.readAsText(file);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  // CSV Import: Confirm Batch Upsert
  const handleConfirmCsvImport = async () => {
    if (csvPreviewRows.length === 0) return;
    setIsImportingCsv(true);

    try {
      const result = await bulkUpsertProducts(csvPreviewRows);
      showToast(`Import finished: ${result.created} created, ${result.updated} updated`);
      setIsCsvModalOpen(false);
      setCsvPreviewRows([]);
      setCsvErrors([]);
      await onRefreshProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setIsImportingCsv(false);
    }
  };

  // Bulk Photos: Match Files to Products by Filename / SKU
  const handleBulkPhotosSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkPhotosModalOpen(true);
    setBulkPhotoProgress(`Processing ${files.length} images...`);

    let matched = 0;
    const fileList = Array.from(files);

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const baseName = file.name.toLowerCase().replace(/\.[^/.]+$/, '');
        setBulkPhotoProgress(`Optimizing ${i + 1}/${fileList.length}: ${file.name}...`);

        // Find matching product by SKU or base name
        const match = products.find(
          (p) =>
            p.sku.toLowerCase() === baseName ||
            p.name.toLowerCase().replace(/[^a-z0-9]/g, '_') === baseName
        );

        if (match) {
          const { blob } = await cropAndCompressImage(file, { size: 600, maxBytes: 40 * 1024 });
          const uploadedUrl = await uploadProductImage(blob, `${match.sku}.webp`);
          await upsertProduct({ ...match, image_url: uploadedUrl });
          matched++;
        }
      }

      showToast(`Bulk photos: ${matched} of ${files.length} products updated`);
      await onRefreshProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk photos upload failed');
    } finally {
      setBulkPhotoProgress(null);
      setIsBulkPhotosModalOpen(false);
      if (bulkPhotosInputRef.current) bulkPhotosInputRef.current.value = '';
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvContent = exportProductsToCsv(products, categories);
    downloadCsv(csvContent, `plinkit-products-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(`Exported ${products.length} products to CSV`);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Action Bar: Search, Filters, Add, CSV & Bulk Media */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, SKU, brand..."
            className="w-full h-11 pl-10 pr-9 rounded-xl border border-line bg-surface text-ink text-sm focus:outline-none focus:border-brand shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Product Button */}
          <Button
            variant="primary"
            onClick={handleOpenAddModal}
            className="h-11 px-4 text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add product</span>
          </Button>

          {/* CSV Import */}
          <label className="h-11 px-3.5 rounded-xl border border-line bg-surface hover:bg-canvas text-xs font-bold text-ink flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
            <Upload size={16} strokeWidth={2} />
            <span>Import CSV</span>
            <input
              type="file"
              ref={csvFileInputRef}
              accept=".csv"
              onChange={handleCsvFileSelect}
              className="hidden"
            />
          </label>

          {/* Bulk Photos */}
          <label className="h-11 px-3.5 rounded-xl border border-line bg-surface hover:bg-canvas text-xs font-bold text-ink flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
            <ImageIcon size={16} strokeWidth={2} />
            <span>Bulk photos</span>
            <input
              type="file"
              ref={bulkPhotosInputRef}
              multiple
              accept="image/*"
              onChange={handleBulkPhotosSelect}
              className="hidden"
            />
          </label>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 px-3.5 rounded-xl border border-line bg-surface hover:bg-canvas text-xs font-bold text-ink flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download size={16} strokeWidth={2} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface rounded-xl border border-line px-3 py-1.5 text-xs">
          <Filter size={14} strokeWidth={2} className="text-ink-2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-ink font-semibold focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Chips */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            statusFilter === 'all'
              ? 'bg-ink text-white border-ink'
              : 'bg-surface text-ink-2 border-line hover:text-ink'
          }`}
        >
          All ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            statusFilter === 'active'
              ? 'bg-emerald-100 text-success border-emerald-300'
              : 'bg-surface text-ink-2 border-line hover:text-success'
          }`}
        >
          Active ({products.filter((p) => p.is_active).length})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('inactive')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            statusFilter === 'inactive'
              ? 'bg-slate-200 text-ink-2 border-slate-300'
              : 'bg-surface text-ink-2 border-line hover:text-ink'
          }`}
        >
          Deactivated ({products.filter((p) => !p.is_active).length})
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-surface rounded-2xl border border-line">
            <p className="type-subtitle font-bold text-ink">No products found</p>
            <p className="type-caption text-ink-2 mt-1">Try clearing your filters or adding a new product.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const cat = categories.find((c) => c.id === p.category_id);

            return (
              <div
                key={p.id}
                className={`bg-surface rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                  !p.is_active ? 'opacity-65 bg-canvas/40 border-line/60' : 'border-line'
                }`}
              >
                <div>
                  {/* Top Bar: SKU, Category, Active Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="type-caption text-ink-3 uppercase font-bold tracking-wider truncate">
                      {p.sku} · {cat?.name || 'General'}
                    </span>
                    <span
                      className={`type-caption px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        p.is_active
                          ? 'bg-emerald-50 text-success border border-emerald-200'
                          : 'bg-slate-100 text-ink-3 border border-slate-200'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  {/* Product Details & Image Thumbnail */}
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl border border-line bg-canvas overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon size={22} className="text-ink-3" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="type-caption text-ink-2 block truncate">{p.brand}</span>
                      <h3 className="type-subtitle font-bold text-ink leading-snug line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="type-caption text-ink-2 mt-0.5">
                        {p.size_label} · Stock: <span className="font-bold tabular-nums">{p.stock_qty}</span>
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Rail Badge */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
                    <div>
                      <PriceTag amount={p.price} className="type-subtitle font-bold text-ink" />
                      {p.mrp > p.price && (
                        <PriceTag
                          amount={p.mrp}
                          className="type-caption text-ink-3 line-through ml-2"
                        />
                      )}
                    </div>

                    {p.rail && (
                      <span className="type-caption px-2 py-0.5 rounded-full bg-brand-soft text-brand font-semibold text-[11px]">
                        {p.rail.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions: Edit & Deactivate */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleDeactivate(p)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      p.is_active
                        ? 'text-ink-2 border-line hover:text-danger hover:border-red-200 hover:bg-red-50'
                        : 'text-success border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {p.is_active ? (
                      <>
                        <EyeOff size={14} strokeWidth={2} />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} strokeWidth={2} />
                        <span>Reactivate</span>
                      </>
                    )}
                  </button>

                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEditModal(p)}
                    className="h-9 px-3 text-xs font-bold flex items-center gap-1"
                  >
                    <Edit2 size={13} strokeWidth={2} />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-line max-w-xl w-full p-6 shadow-floating my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="type-title font-bold text-ink">
                {editingProduct.id ? `Edit ${editingProduct.name}` : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Photo Upload with Square Crop & WebP Info */}
              <div className="p-4 rounded-xl border border-line bg-canvas flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-line bg-surface overflow-hidden shrink-0 flex items-center justify-center relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Crop preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon size={32} className="text-ink-3" />
                  )}
                  {imageProcessing && (
                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center text-white text-xs">
                      Cropping...
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <span className="type-subtitle font-bold text-ink block">Product photo</span>
                  <p className="type-caption text-ink-2">
                    Auto-crops 1:1, resizes to 600 px, and converts to WebP under 40 KB.
                  </p>
                  {imageSizeLabel && (
                    <span className="type-caption px-2 py-0.5 rounded-full bg-emerald-50 text-success border border-emerald-200 font-bold inline-block">
                      {imageSizeLabel}
                    </span>
                  )}
                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                    <label className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-canvas text-xs font-bold text-ink flex items-center gap-1.5 cursor-pointer shadow-xs">
                      <Camera size={14} strokeWidth={2} />
                      <span>Choose / Take photo</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    SKU (Unique) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. CHIP-01"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={editingProduct.category_id || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category_id: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    placeholder="e.g. Classic Salted Potato Chips"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={editingProduct.brand || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                    placeholder="e.g. Crispy Farms"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={editingProduct.subcategory || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, subcategory: e.target.value })
                    }
                    placeholder="e.g. Potato Chips"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Size Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.size_label || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, size_label: e.target.value })
                    }
                    placeholder="e.g. 50 g or 250 ml"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Homepage Rail
                  </label>
                  <select
                    value={editingProduct.rail || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        rail: (e.target.value as ProductRail) || null,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="">None</option>
                    <option value="late_night">Late Night Cravings</option>
                    <option value="bestsellers">Campus Bestsellers</option>
                    <option value="new">New Arrivals</option>
                  </select>
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.price ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        price: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    MRP (₹) * (≥ Price)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.mrp ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        mrp: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Initial Stock Qty *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.stock_qty ?? ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock_qty: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Max Per Order
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProduct.max_per_order ?? 5}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        max_per_order: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Search Keywords & Hinglish (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.keywords?.join(', ') || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        keywords: e.target.value
                          .split(',')
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="e.g. chips, namkeen, wafers, aloo"
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, description: e.target.value })
                    }
                    placeholder="Optional short customer description..."
                    className="w-full p-2.5 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={editingProduct.manufacturer || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, manufacturer: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="type-caption font-semibold text-ink-2 block mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    value={editingProduct.country_of_origin || 'India'}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, country_of_origin: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-line bg-canvas text-ink text-sm focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod-is-active"
                  checked={editingProduct.is_active ?? true}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-brand rounded"
                />
                <label htmlFor="prod-is-active" className="text-sm font-semibold text-ink">
                  Product is active and visible in storefront
                </label>
              </div>

              {/* Bottom Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={isSavingProduct}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSavingProduct}>
                  {isSavingProduct ? 'Saving...' : 'Save Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Preview Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-surface rounded-2xl border border-line max-w-2xl w-full p-6 shadow-floating my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="type-title font-bold text-ink">CSV Import Preview</h2>
                <p className="type-caption text-ink-2">
                  Validate rows before applying any database upserts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-canvas"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Validation Summary */}
            <div className="flex items-center gap-3">
              <span className="type-caption px-3 py-1 rounded-full bg-emerald-50 text-success border border-emerald-200 font-bold">
                {csvPreviewRows.length} valid rows
              </span>
              {csvErrors.length > 0 && (
                <span className="type-caption px-3 py-1 rounded-full bg-red-50 text-danger border border-red-200 font-bold">
                  {csvErrors.length} errors found
                </span>
              )}
            </div>

            {/* Error List */}
            {csvErrors.length > 0 && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-danger space-y-1 max-h-40 overflow-y-auto">
                <span className="font-bold block">Validation Errors:</span>
                {csvErrors.map((err, i) => (
                  <div key={i}>
                    Line {err.row} {err.sku ? `(SKU: ${err.sku})` : ''}: {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Valid Rows Preview Table */}
            {csvPreviewRows.length > 0 && (
              <div className="border border-line rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-canvas border-b border-line font-bold text-ink-2">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {csvPreviewRows.map((r, i) => (
                      <tr key={i} className="hover:bg-canvas/50">
                        <td className="p-2 font-bold">{r.sku}</td>
                        <td className="p-2 truncate max-w-[150px]">{r.name}</td>
                        <td className="p-2">{r.category_slug}</td>
                        <td className="p-2">₹{r.price}</td>
                        <td className="p-2">{r.stock_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
              <Button
                variant="secondary"
                onClick={() => setIsCsvModalOpen(false)}
                disabled={isImportingCsv}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCsvImport}
                disabled={csvPreviewRows.length === 0 || isImportingCsv}
              >
                {isImportingCsv ? 'Upserting...' : `Upsert ${csvPreviewRows.length} Valid Products`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Photos Modal */}
      {isBulkPhotosModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-line max-w-sm w-full p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand-soft text-brand flex items-center justify-center mx-auto animate-spin">
              <Layers size={24} />
            </div>
            <h3 className="type-subtitle font-bold text-ink">Bulk Photo Upload</h3>
            <p className="type-caption text-ink-2">{bulkPhotoProgress || 'Matching images to products...'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
