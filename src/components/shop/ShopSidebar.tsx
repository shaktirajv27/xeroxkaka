import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  LayoutDashboard,
  Printer,
  FileText,
  Users,
  BarChart3,
  Settings,
  QrCode,
  Volume2,
  VolumeX,
  LogOut,
  ExternalLink,
  Store,
  X,
} from 'lucide-react';

interface ShopSidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  pendingCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ShopSidebar: React.FC<ShopSidebarProps> = ({
  currentPath,
  onNavigate,
  pendingCount = 0,
  isOpen = false,
  onClose,
}) => {
  const { currentShop, allUserShops, switchShop, user, logout } = useAuth();
  const { soundEnabled, toggleSound } = useNotification();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Print Queue',
      path: '/print-queue',
      icon: Printer,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { label: 'All Orders', path: '/orders', icon: FileText },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Shop Settings', path: '/settings', icon: Settings },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  const sidebarContent = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800 select-none">
      {/* Brand & Shop Switcher */}
      <div className="p-4 sm:p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 px-2 rounded-xl bg-white flex items-center justify-center shadow-xs">
              <img src="/logo.png" alt="PrintSetu" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <h2 className="font-black text-white text-base leading-tight tracking-tight">PrintSetu</h2>
              <span className="text-[10px] text-sky-400 font-bold tracking-wider uppercase">
                Shop Cockpit
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Active Store Branch */}
        <div className="mt-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
              <Store className="w-3 h-3 text-sky-400" /> Store Branch
            </span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded-full uppercase">
              Live
            </span>
          </div>

          {allUserShops.length > 1 ? (
            <select
              value={currentShop?.id || ''}
              onChange={(e) => switchShop(e.target.value)}
              className="w-full bg-slate-900 text-white text-xs p-1.5 rounded-lg border border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-medium"
            >
              {allUserShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shop_name} • {s.city}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs font-bold text-white truncate py-0.5">
              {currentShop?.shop_name || 'My Print Shop'}
              <div className="text-[10px] text-slate-400 font-normal">
                {currentShop?.city || 'Main Branch'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Public Storefront Link */}
        {currentShop && (
          <div className="pt-3 mt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => handleNavClick(`/s/${currentShop.slug}`)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Customer Order URL</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </nav>

      {/* Footer / User / Sound Toggle */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Audio Chime:</span>
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'text-emerald-400 hover:bg-emerald-950/50'
                  : 'text-slate-500 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Mute sound' : 'Enable audio alert'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'Shop Owner'}</p>
            <p className="text-[11px] text-slate-400 truncate">{currentShop?.shop_name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('/login');
            }}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-50 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
