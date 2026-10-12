import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/common/Toast';
import { HomePage } from '@/pages/HomePage';
import { CategoryPage } from '@/pages/CategoryPage';
import { StyleguidePage } from '@/pages/StyleguidePage';
import {
  SearchPagePlaceholder,
  CartPagePlaceholder,
  CheckoutPagePlaceholder,
  OrdersPagePlaceholder,
  OrderDetailPagePlaceholder,
  AccountPagePlaceholder,
  AdminPagePlaceholder,
  NotFoundPage,
} from '@/pages/Placeholders';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:slug" element={<CategoryPage />} />
            <Route path="/search" element={<SearchPagePlaceholder />} />
            <Route path="/cart" element={<CartPagePlaceholder />} />
            <Route path="/checkout" element={<CheckoutPagePlaceholder />} />
            <Route path="/orders" element={<OrdersPagePlaceholder />} />
            <Route path="/orders/:id" element={<OrderDetailPagePlaceholder />} />
            <Route path="/account" element={<AccountPagePlaceholder />} />
            <Route path="/admin" element={<AdminPagePlaceholder />} />
            <Route path="/styleguide" element={<StyleguidePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
