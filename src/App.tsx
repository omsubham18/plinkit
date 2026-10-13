import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/common/Toast';
import { useAuthStore } from '@/lib/authStore';
// Route-level code-splitting for maximum 4G mobile performance
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })));
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrdersPage = lazy(() => import('@/pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const AccountPage = lazy(() => import('@/pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const AboutPage = lazy(() => import('@/pages/static/AboutPage').then((m) => ({ default: m.AboutPage })));
const TermsPage = lazy(() => import('@/pages/static/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('@/pages/static/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const RefundsPage = lazy(() => import('@/pages/static/RefundsPage').then((m) => ({ default: m.RefundsPage })));
const StyleguidePage = lazy(() => import('@/pages/StyleguidePage').then((m) => ({ default: m.StyleguidePage })));
const NotFoundPage = lazy(() => import('@/pages/Placeholders').then((m) => ({ default: m.NotFoundPage })));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));

const RouteFallback: React.FC = () => (
  <div className="min-h-screen p-4 space-y-4 animate-pulse">
    <div className="h-7 bg-canvas rounded-xl w-1/3" />
    <div className="h-28 bg-canvas rounded-2xl w-full" />
    <div className="grid grid-cols-2 gap-3 pt-2">
      <div className="h-48 bg-canvas rounded-2xl" />
      <div className="h-48 bg-canvas rounded-2xl" />
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
    },
  },
});

export const App: React.FC = () => {
  // Initialize Supabase auth session listener on mount
  useEffect(() => {
    const cleanup = useAuthStore.getState().initializeAuth();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Customer Storefront Routes (wrapped in 480px AppShell with AppFooter) */}
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/c/:slug" element={<CategoryPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/refunds" element={<RefundsPage />} />
                <Route path="/styleguide" element={<StyleguidePage />} />
              </Route>

              {/* Operator Console Route (Lazy-loaded separate chunk, full-width responsive layout) */}
              <Route
                path="/admin"
                element={
                  <Suspense
                    fallback={
                      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
                        <div className="w-8 h-8 rounded-full border-2 border-line border-t-brand animate-spin" />
                      </div>
                    }
                  >
                    <AdminPage />
                  </Suspense>
                }
              />

              {/* Global 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
