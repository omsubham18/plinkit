import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/common/FeedbackStates';
import { ArrowLeft, Search, ShoppingBag, CreditCard, Clock, User, ShieldAlert, FileQuestion } from 'lucide-react';

export const SearchPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Search</h1>
      </div>
      <EmptyState
        icon={<Search size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="Search functionality will be implemented in the next task."
        actionLabel="Go to home"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const CartPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Cart</h1>
      </div>
      <EmptyState
        icon={<ShoppingBag size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="Your cart is currently empty."
        actionLabel="Browse products"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const CheckoutPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Checkout</h1>
      </div>
      <EmptyState
        icon={<CreditCard size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="Checkout and Google sign-in placeholder."
        actionLabel="Back to store"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const OrdersPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Orders</h1>
      </div>
      <EmptyState
        icon={<Clock size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="No orders placed yet. Orders will appear here."
        actionLabel="Start shopping"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const OrderDetailPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Order #{id || '1001'}</h1>
      </div>
      <EmptyState
        icon={<Clock size={32} strokeWidth={1.75} className="text-ink-2" />}
        message={`Live timeline and status details for Order #${id || '1001'}.`}
        actionLabel="All orders"
        onAction={() => navigate('/orders')}
      />
    </div>
  );
};

export const AccountPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Account</h1>
      </div>
      <EmptyState
        icon={<User size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="Profile details, campus location, and phone number settings."
        actionLabel="Back to store"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const AdminPagePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-canvas"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="type-title text-ink font-bold">Operator Console</h1>
      </div>
      <EmptyState
        icon={<ShieldAlert size={32} strokeWidth={1.75} className="text-ink-2" />}
        message="Operator console (/admin) is restricted to verified store operators."
        actionLabel="Return to store"
        onAction={() => navigate('/')}
      />
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-canvas border border-line flex items-center justify-center mb-4">
        <FileQuestion size={32} strokeWidth={1.75} className="text-ink-2" />
      </div>
      <h1 className="type-display text-ink font-bold mb-2">Page not found</h1>
      <p className="type-body text-ink-2 max-w-[280px] mb-6">
        The link you followed does not exist or has been moved.
      </p>
      <Button variant="primary" onClick={() => navigate('/')} className="min-w-[160px]">
        Back to home
      </Button>
    </div>
  );
};
