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

// Components & Icons
import { ShopSidebar } from './components/shop/ShopSidebar';
import { Menu, ExternalLink } from 'lucide-react';

function MainRouter() {
  const { currentShop, user } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{ number: string; phone: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        onSelectShop={(newSlug) => navigate(`/s/${newSlug}`)}
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

  // Shop Owner Dashboard Routes (Wrapped in ShopSidebar Layout with Mobile Drawer)
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
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-100 font-sans">
        {/* Mobile Header with Hamburger Menu and PrintSetu Logo */}
        <header className="md:hidden bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-hidden cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="h-7 px-1.5 rounded-lg bg-white flex items-center justify-center">
              <img src="/logo.png" alt="PrintSetu" className="h-5 w-auto object-contain" />
            </div>
            <span className="font-bold text-xs text-white truncate max-w-[130px]">
              {currentShop?.shop_name || 'PrintSetu'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentShop && (
              <a
                href={`/s/${currentShop.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs"
              >
                <span>Storefront</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </header>

        {/* Sidebar Component (Persistent on desktop, drawer on mobile) */}
        <ShopSidebar
          currentPath={currentPath}
          onNavigate={(p) => {
            navigate(p);
            setMobileMenuOpen(false);
          }}
          pendingCount={0}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full">
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

  // Default Landing Page (also handles /order, /shops, etc.)
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
