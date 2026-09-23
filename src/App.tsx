import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ShopOrderPage } from './pages/customer/ShopOrderPage';
import { OrderSuccessPage } from './pages/customer/OrderSuccessPage';
import { OrderTrackPage } from './pages/customer/OrderTrackPage';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/shop/DashboardPage';
import { PrintQueuePage } from './pages/shop/PrintQueuePage';
import { OrdersHistoryPage } from './pages/shop/OrdersHistoryPage';
import { CustomersPage } from './pages/shop/CustomersPage';
import { AnalyticsPage } from './pages/shop/AnalyticsPage';
import { SettingsPage } from './pages/shop/SettingsPage';

// Components
import { ShopSidebar } from './components/shop/ShopSidebar';

function MainRouter() {
  const { currentShop, user } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{ number: string; phone: string } | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route: /s/:shopSlug
  if (currentPath.startsWith('/s/')) {
    const slug = currentPath.replace('/s/', '').split('/')[0];
    return (
      <ShopOrderPage
        shopSlug={slug}
        onOrderPlaced={(orderNumber, customerPhone) => {
          setLastPlacedOrder({ number: orderNumber, phone: customerPhone });
          navigate(`/success/${orderNumber}`);
        }}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // Route: /success/:orderNumber
  if (currentPath.startsWith('/success/')) {
    const orderNumber = currentPath.replace('/success/', '').split('/')[0];
    return (
      <OrderSuccessPage
        orderNumber={orderNumber}
        customerPhone={lastPlacedOrder?.phone}
        onTrackOrder={(num) => navigate(`/track/${num}`)}
        onNewOrder={() => navigate(currentShop ? `/s/${currentShop.slug}` : '/')}
      />
    );
  }

  // Route: /track/:orderNumber
  if (currentPath.startsWith('/track/')) {
    const orderNumber = currentPath.replace('/track/', '').split('/')[0];
    return (
      <OrderTrackPage
        orderNumber={orderNumber}
        initialPhone={lastPlacedOrder?.number === orderNumber ? lastPlacedOrder.phone : ''}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // Route: /login or /login?tab=register
  if (currentPath.startsWith('/login')) {
    if (user) {
      navigate('/dashboard');
      return null;
    }
    const isRegister = currentPath.includes('register') || window.location.search.includes('register');
    return (
      <LoginPage
        initialTab={isRegister ? 'register' : 'login'}
        onLoginSuccess={() => navigate('/dashboard')}
        onNavigateHome={() => navigate('/')}
      />
    );
  }

  // Shop Owner Dashboard Routes (Wrapped in ShopSidebar Layout)
  const isShopRoute = [
    '/dashboard',
    '/print-queue',
    '/orders',
    '/customers',
    '/analytics',
    '/settings',
  ].some((r) => currentPath === r || currentPath.startsWith(`${r}/`));

  if (isShopRoute) {
    if (!user) {
      return (
        <LoginPage
          onLoginSuccess={() => navigate(currentPath)}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    return (
      <div className="flex h-screen overflow-hidden bg-slate-100 font-sans">
        <ShopSidebar
          currentPath={currentPath}
          onNavigate={navigate}
          pendingCount={0}
        />
        <main className="flex-1 overflow-y-auto">
          {currentPath === '/dashboard' && <DashboardPage onNavigate={navigate} />}
          {currentPath === '/print-queue' && <PrintQueuePage />}
          {currentPath === '/orders' && <OrdersHistoryPage />}
          {currentPath === '/customers' && <CustomersPage />}
          {currentPath === '/analytics' && <AnalyticsPage />}
          {currentPath === '/settings' && <SettingsPage />}
        </main>
      </div>
    );
  }

  // Default Landing Page
  return (
    <LandingPage
      onOpenShop={(slug) => navigate(`/s/${slug}`)}
      onTrackOrder={(orderNumber) => navigate(`/track/${orderNumber}`)}
      onOpenDashboard={() => navigate('/dashboard')}
      onOpenLogin={(tab) => navigate(tab === 'register' ? '/login?tab=register' : '/login')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainRouter />
      </NotificationProvider>
    </AuthProvider>
  );
}
