import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, Clock, Sparkles, Send, Check } from 'lucide-react';
import { useCatalogue } from '@/lib/catalogue';
import { useCartStore, getCartSummary } from '@/lib/cartStore';
import {
  buildSearchIndex,
  searchCatalogue,
  logSearchMiss,
  submitItemRequest,
  SearchTieredResults,
} from '@/lib/search';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '@/lib/searchHistory';
import { ProductCard } from '@/components/common/ProductCard';
import { ProductRail } from '@/components/common/ProductRail';
import { ProductSheet } from '@/components/common/ProductSheet';
import { CartBar } from '@/components/common/CartBar';
import { SkeletonProductCard } from '@/components/ui/Skeletons';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useToast } from '@/components/common/Toast';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

const POPULAR_SEARCHES = [
  'Maggi',
  'Cold drink',
  'Chips',
  'Chocolates',
  'Chai',
  'Biscuits',
  'Coffee',
  'Notebook',
];

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: catalogue } = useCatalogue();
  const products = useMemo(() => catalogue?.products || [], [catalogue?.products]);
  const categories = useMemo(() => catalogue?.categories || [], [catalogue?.categories]);

  const { items, increment, decrement, reconcile } = useCartStore();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedProductForSheet, setSelectedProductForSheet] = useState<Product | null>(null);

  // Item request state for no-match fallback
  const [itemRequestText, setItemRequestText] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Ref to track whether current query has been logged to search_misses
  const loggedMissRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input on arrival per SPEC Section 8
  useEffect(() => {
    inputRef.current?.focus();
    setRecentSearches(getRecentSearches());
  }, []);

  // Reconcile cart if products load
  useEffect(() => {
    if (products.length > 0) {
      reconcile(products);
    }
  }, [products, reconcile]);

  // Build / memoize MiniSearch index
  const searchIndex = useMemo(() => {
    if (products.length === 0) return null;
    return buildSearchIndex(products, categories);
  }, [products, categories]);

  // Execute tiered search
  const searchResults = useMemo((): SearchTieredResults => {
    if (!searchIndex || !query.trim()) {
      return {
        inStockTier1: [],
        inStockTier2: [],
        outOfStockTier3: [],
        totalCount: 0,
      };
    }
    return searchCatalogue(query, searchIndex, products);
  }, [query, searchIndex, products]);

  const { inStockTier1, inStockTier2, outOfStockTier3, totalCount } = searchResults;

  // Debounced search miss logging (1.5s pause or screen exit, >= 3 chars, 0 results)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length >= 3 && totalCount === 0 && searchIndex) {
      debounceTimerRef.current = setTimeout(() => {
        if (loggedMissRef.current !== trimmed) {
          logSearchMiss(trimmed);
          loggedMissRef.current = trimmed;
        }
      }, 1500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, totalCount, searchIndex]);

  // Log on screen exit if unlogged miss >= 3 chars
  useEffect(() => {
    return () => {
      const trimmed = query.trim();
      if (
        trimmed.length >= 3 &&
        totalCount === 0 &&
        loggedMissRef.current !== trimmed
      ) {
        logSearchMiss(trimmed);
      }
    };
  }, [query, totalCount]);

  const handleSelectQuery = (selectedQuery: string) => {
    setQuery(selectedQuery);
    setRecentSearches(addRecentSearch(selectedQuery));
    inputRef.current?.focus();
  };

  const handleClearQuery = () => {
    setQuery('');
    setItemRequestText('');
    setRequestSubmitted(false);
    inputRef.current?.focus();
  };

  const handleClearAllRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = itemRequestText.trim() || query.trim();
    if (!textToSubmit) return;

    setIsSubmittingRequest(true);
    const result = await submitItemRequest(textToSubmit);
    setIsSubmittingRequest(false);

    if (result.success) {
      setRequestSubmitted(true);
      showToast('Item request submitted to the store team');
    } else {
      showToast(result.error || 'Failed to submit request');
    }
  };

  const bestsellers = useMemo(
    () => products.filter((p) => p.rail === 'bestsellers' && p.stock_qty > 0),
    [products]
  );

  const { totalCount: cartTotalCount, itemsTotal: cartItemsTotal } = getCartSummary(
    items,
    products
  );

  const hasQuery = query.trim().length > 0;
  const isSearching = hasQuery && !searchIndex;
  const isNoMatch = hasQuery && Boolean(searchIndex) && totalCount === 0;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Search Header with Instant Search Input */}
      <header className="sticky top-0 z-40 bg-surface border-b border-line px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas active:bg-line transition-colors shrink-0"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="relative flex-1 flex items-center">
          <Search
            size={18}
            className="absolute left-3 text-ink-2 pointer-events-none"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setRequestSubmitted(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                setRecentSearches(addRecentSearch(query.trim()));
              }
            }}
            placeholder="Search snacks, drinks, essentials"
            className={cn(
              'w-full h-12 pl-10 pr-10 rounded-button bg-canvas text-ink',
              'type-body font-medium placeholder:text-ink-3',
              'border border-transparent focus:border-brand focus:bg-surface focus:outline-none transition-colors'
            )}
          />
          {hasQuery && (
            <button
              type="button"
              onClick={handleClearQuery}
              aria-label="Clear search"
              className="absolute right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:text-ink active:bg-line/60"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {isSearching ? (
        <div className="grid grid-cols-2 gap-3 p-4">
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
        </div>
      ) : !hasQuery ? (
        /* Empty Search Screen per SPEC Section 8 */
        <div className="flex flex-col gap-6 p-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="type-caption font-bold text-ink-2 uppercase tracking-wider">
                  Recent searches
                </h3>
                <button
                  type="button"
                  onClick={handleClearAllRecent}
                  className="type-caption text-brand font-bold hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleSelectQuery(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-canvas border border-line text-ink type-caption font-semibold active:bg-line/60"
                  >
                    <Clock size={13} className="text-ink-2" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular Searches */}
          <section>
            <h3 className="type-caption font-bold text-ink-2 uppercase tracking-wider mb-2.5">
              Popular searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((popular) => (
                <Chip
                  key={popular}
                  label={popular}
                  onClick={() => handleSelectQuery(popular)}
                />
              ))}
            </div>
          </section>

          {/* Category Shortcuts */}
          {categories.length > 0 && (
            <section>
              <h3 className="type-caption font-bold text-ink-2 uppercase tracking-wider mb-2.5">
                Category shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => navigate(`/c/${cat.slug}`)}
                    className="p-3 rounded-card border border-line bg-surface hover:bg-canvas text-left flex items-center justify-between transition-colors"
                  >
                    <span className="type-body font-bold text-ink">{cat.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : isNoMatch ? (
        /* No Match Screen per SPEC Section 8 */
        <div className="flex flex-col gap-6 p-4">
          <div className="bg-canvas border border-line rounded-card p-4 text-center">
            <h2 className="type-title text-ink font-bold mb-1">
              No results for &ldquo;{query}&rdquo;
            </h2>
            <p className="type-caption text-ink-2">
              Check the spelling or request this item below.
            </p>
          </div>

          {/* One-Tap Request This Item */}
          <div className="bg-surface rounded-card border border-line p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-brand" />
              <h3 className="type-body font-bold text-ink">
                Can&apos;t find what you need?
              </h3>
            </div>
            <p className="type-caption text-ink-2 mb-3">
              Request this item and our store team will look into stocking it.
            </p>

            {requestSubmitted ? (
              <div className="bg-success/10 border border-success/30 rounded-button p-3 flex items-center gap-2 text-success type-caption font-semibold">
                <Check size={18} strokeWidth={2.5} />
                <span>Request noted! We&apos;ll notify the campus store team.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="flex gap-2">
                <input
                  type="text"
                  maxLength={120}
                  value={itemRequestText || query}
                  onChange={(e) => setItemRequestText(e.target.value)}
                  placeholder="e.g. Red Bull 250ml or Brown Bread"
                  className="flex-1 h-11 px-3 rounded-button bg-canvas border border-line text-ink type-body focus:border-brand focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmittingRequest}
                  className="h-11 px-4"
                >
                  <Send size={16} className="mr-1" />
                  Request
                </Button>
              </form>
            )}
          </div>

          {/* Bestsellers Fallback per SPEC Section 8 */}
          {bestsellers.length > 0 && (
            <div className="-mx-4">
              <ProductRail
                title="Campus bestsellers you might like"
                products={bestsellers}
                cartItems={items}
                onAdd={(prod) => increment(prod, showToast)}
                onIncrement={(prod) => increment(prod, showToast)}
                onDecrement={(prod) => decrement(prod.id)}
                onCapReached={showToast}
                onClickProduct={(prod) => setSelectedProductForSheet(prod)}
              />
            </div>
          )}
        </div>
      ) : (
        /* Three-Tier Results Layout per SPEC Section 8 */
        <div className="flex flex-col gap-6 p-4">
          {/* Tier 1: In-Stock Exact & Prefix Matches */}
          {inStockTier1.length > 0 && (
            <section>
              <div className="grid grid-cols-2 gap-3">
                {inStockTier1.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQty={items[product.id] || 0}
                    onAdd={(prod) => increment(prod, showToast)}
                    onIncrement={(prod) => increment(prod, showToast)}
                    onDecrement={(prod) => decrement(prod.id)}
                    onCapReached={showToast}
                    onClick={(prod) => setSelectedProductForSheet(prod)}
                    onSeeSimilar={(prod) => setSelectedProductForSheet(prod)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tier 2: In-Stock Fuzzy Matches */}
          {inStockTier2.length > 0 && (
            <section>
              {inStockTier1.length > 0 && (
                <h3 className="type-caption font-bold text-ink-2 uppercase tracking-wider mb-2.5">
                  Related matches
                </h3>
              )}
              <div className="grid grid-cols-2 gap-3">
                {inStockTier2.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQty={items[product.id] || 0}
                    onAdd={(prod) => increment(prod, showToast)}
                    onIncrement={(prod) => increment(prod, showToast)}
                    onDecrement={(prod) => decrement(prod.id)}
                    onCapReached={showToast}
                    onClick={(prod) => setSelectedProductForSheet(prod)}
                    onSeeSimilar={(prod) => setSelectedProductForSheet(prod)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tier 3: Out-of-Stock Matches, Dimmed + "Similar in stock" row */}
          {outOfStockTier3.length > 0 && (
            <section className="flex flex-col gap-4 border-t border-line/60 pt-4">
              <h3 className="type-caption font-bold text-ink-2 uppercase tracking-wider">
                Out of stock
              </h3>
              {outOfStockTier3.map(({ product, similar }) => (
                <div
                  key={product.id}
                  className="bg-canvas/50 border border-line rounded-card p-3 flex flex-col gap-3"
                >
                  <div className="w-1/2">
                    <ProductCard
                      product={product}
                      cartQty={0}
                      onClick={(prod: Product) => setSelectedProductForSheet(prod)}
                    />
                  </div>

                  {similar.length > 0 && (
                    <div className="border-t border-line/60 pt-2 -mx-3">
                      <ProductRail
                        title="Similar in stock"
                        products={similar}
                        cartItems={items}
                        onAdd={(prod) => increment(prod, showToast)}
                        onIncrement={(prod) => increment(prod, showToast)}
                        onDecrement={(prod) => decrement(prod.id)}
                        onCapReached={showToast}
                        onClickProduct={(prod) => setSelectedProductForSheet(prod)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {/* Floating CartBar */}
      <CartBar
        totalItems={cartTotalCount}
        totalPrice={cartItemsTotal}
        onViewCart={() => navigate('/cart')}
      />

      {/* Product Sheet Modal */}
      <ProductSheet
        product={selectedProductForSheet}
        allProducts={products}
        isOpen={Boolean(selectedProductForSheet)}
        onClose={() => setSelectedProductForSheet(null)}
        cartQty={selectedProductForSheet ? items[selectedProductForSheet.id] || 0 : 0}
        cartItems={items}
        onAdd={(prod) => increment(prod, showToast)}
        onIncrement={(prod) => increment(prod, showToast)}
        onDecrement={(prod) => decrement(prod.id)}
        onCapReached={showToast}
        onSelectSimilarProduct={(simProd) => setSelectedProductForSheet(simProd)}
      />
    </div>
  );
};
