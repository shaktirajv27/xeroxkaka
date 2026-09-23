import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shop, Profile } from '../types/database';
import { db, generateUUID } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_PRICING_RULES, DEFAULT_SERVICES } from '../lib/priceEngine';

const CACHED_USER_KEY = 'xeroxflow_cached_user';
const CACHED_SHOP_KEY = 'xeroxflow_cached_shop';
const CACHED_ALL_SHOPS_KEY = 'xeroxflow_cached_all_shops';
const ACTIVE_SHOP_ID_KEY = 'xeroxflow_active_shop_id';

interface RegisterShopParams {
  email: string;
  password: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
}

interface AuthContextType {
  user: Profile | null;
  currentShop: Shop | null;
  allUserShops: Shop[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  registerShop: (params: RegisterShopParams) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  logout: () => void;
  switchShop: (shopId: string) => Promise<void>;
  refreshShop: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Fast hydration directly from localStorage for instant sub-20ms first paint
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem(CACHED_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentShop, setCurrentShop] = useState<Shop | null>(() => {
    try {
      const saved = localStorage.getItem(CACHED_SHOP_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [allUserShops, setAllUserShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem(CACHED_ALL_SHOPS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Non-blocking background session verification
    verifySession();
  }, []);

  async function verifySession() {
    if (!isSupabaseConfigured || !supabase) {
      // Offline / Local fallback: ensure at least default shops are available
      if (!currentShop) {
        const shops = await db.getAllShops();
        if (shops.length > 0) {
          setAllUserShops(shops);
          const savedShopId = localStorage.getItem(ACTIVE_SHOP_ID_KEY) || shops[0].id;
          const match = shops.find((s) => s.id === savedShopId) || shops[0];
          setCurrentShop(match);
          localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(match));
          localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(shops));
        }
      }
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Active user session verified
        const [profileRes, shopsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
          supabase.from('shops').select('*').eq('is_active', true),
        ]);

        const verifiedProfile: Profile = profileRes.data || {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'Shop Owner',
          email: session.user.email || '',
          role: 'shop_owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const activeShops: Shop[] = (shopsRes.data as Shop[]) || [];
        const savedShopId = localStorage.getItem(ACTIVE_SHOP_ID_KEY);
        const userShop =
          activeShops.find((s) => s.owner_id === session.user.id) ||
          activeShops.find((s) => s.id === savedShopId) ||
          activeShops[0] ||
          null;

        setUser(verifiedProfile);
        setAllUserShops(activeShops);
        if (userShop) {
          setCurrentShop(userShop);
          localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(userShop));
          localStorage.setItem(ACTIVE_SHOP_ID_KEY, userShop.id);
        }

        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(verifiedProfile));
        localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(activeShops));
      } else {
        // No active Supabase session
        const hadSavedUser = localStorage.getItem(CACHED_USER_KEY);
        if (hadSavedUser) {
          // Cached session is expired or logged out
          setUser(null);
          localStorage.removeItem(CACHED_USER_KEY);
        }
        // Still load available shops so public storefronts work seamlessly
        const { data: shops } = await supabase.from('shops').select('*').eq('is_active', true);
        if (shops && shops.length > 0) {
          setAllUserShops(shops as Shop[]);
          localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(shops));
          if (!currentShop) {
            setCurrentShop(shops[0] as Shop);
            localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(shops[0]));
          }
        }
      }
    } catch (err) {
      console.warn('Background session reconciliation notice:', err);
    }
  }

  async function login(email: string, pass: string): Promise<boolean> {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (authErr) {
          throw new Error(authErr.message || 'Invalid email or password.');
        }

        if (authData?.user) {
          const [profileRes, shopsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('user_id', authData.user.id).single(),
            supabase.from('shops').select('*').eq('is_active', true),
          ]);

          const profile: Profile = profileRes.data || {
            id: authData.user.id,
            full_name: authData.user.user_metadata?.full_name || 'Shop Owner',
            email: authData.user.email || email,
            role: 'shop_owner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const shops: Shop[] = (shopsRes.data as Shop[]) || [];
          const matchedShop =
            shops.find((s) => s.owner_id === authData.user.id) ||
            shops.find((s) => s.email?.toLowerCase() === email.toLowerCase()) ||
            shops[0] ||
            null;

          setUser(profile);
          setAllUserShops(shops);
          if (matchedShop) {
            setCurrentShop(matchedShop);
            localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(matchedShop));
            localStorage.setItem(ACTIVE_SHOP_ID_KEY, matchedShop.id);
          }

          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
          localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(shops));
          return true;
        }
      }

      throw new Error('Authentication failed. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  }

  async function registerShop(params: RegisterShopParams): Promise<boolean> {
    setIsLoading(true);
    try {
      const cleanSlug = params.shopName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `shop-${Date.now().toString(36)}`;

      if (isSupabaseConfigured && supabase) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: params.email.trim(),
          password: params.password,
          options: {
            data: {
              full_name: params.ownerName.trim(),
              phone: params.phone.trim(),
            },
          },
        });

        if (signUpErr) {
          throw new Error(signUpErr.message);
        }

        const userId = signUpData?.user?.id || generateUUID();
        const shopId = generateUUID();

        // Create profile
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: params.ownerName.trim(),
          email: params.email.trim(),
          phone: params.phone.trim(),
          role: 'shop_owner',
        });

        // Create shop record
        const newShop: Shop = {
          id: shopId,
          owner_id: userId,
          shop_name: params.shopName.trim(),
          slug: cleanSlug,
          phone: params.phone.trim(),
          email: params.email.trim(),
          whatsapp_number: params.phone.trim(),
          address: `${params.shopName}, Main Road`,
          city: params.city.trim(),
          state: 'State',
          pincode: '000000',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('shops').insert(newShop);

        // Seed default pricing rules
        const rules = DEFAULT_PRICING_RULES.map((r) => ({
          ...r,
          id: generateUUID(),
          shop_id: shopId,
        }));
        await supabase.from('pricing_rules').insert(rules);

        // Seed default services
        const services = DEFAULT_SERVICES.map((s) => ({
          ...s,
          id: generateUUID(),
          shop_id: shopId,
        }));
        await supabase.from('shop_services').insert(services);

        // Seed default settings
        await supabase.from('shop_settings').insert({
          id: generateUUID(),
          shop_id: shopId,
          auto_confirm: false,
          sound_enabled: true,
          retention_hours: 48,
          opening_time: '09:00',
          closing_time: '21:00',
          currency_symbol: '₹',
        });

        const profile: Profile = {
          id: userId,
          full_name: params.ownerName.trim(),
          email: params.email.trim(),
          phone: params.phone.trim(),
          role: 'shop_owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(profile);
        setCurrentShop(newShop);
        setAllUserShops((prev) => [newShop, ...prev]);

        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
        localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(newShop));
        localStorage.setItem(ACTIVE_SHOP_ID_KEY, newShop.id);
        return true;
      }

      // Offline / Local Registration
      const newShop: Shop = {
        id: generateUUID(),
        owner_id: generateUUID(),
        shop_name: params.shopName.trim(),
        slug: cleanSlug,
        phone: params.phone.trim(),
        email: params.email.trim(),
        whatsapp_number: params.phone.trim(),
        address: `${params.shopName}, Market Complex`,
        city: params.city.trim(),
        state: 'Gujarat',
        pincode: '380001',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const ownerId = newShop.owner_id || generateUUID();
      const newProfile: Profile = {
        id: ownerId,
        full_name: params.ownerName.trim(),
        email: params.email.trim(),
        phone: params.phone.trim(),
        role: 'shop_owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setUser(newProfile);
      setCurrentShop(newShop);
      setAllUserShops((prev) => [newShop, ...prev]);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(newProfile));
      localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(newShop));
      localStorage.setItem(ACTIVE_SHOP_ID_KEY, newShop.id);
      return true;
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword(email: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      return true;
    }
    return true;
  }

  function logout() {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(console.warn);
    }
    setUser(null);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_SHOP_KEY);
    localStorage.removeItem(ACTIVE_SHOP_ID_KEY);
  }

  async function switchShop(shopId: string) {
    const shop = await db.getShopById(shopId);
    if (shop) {
      setCurrentShop(shop);
      localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(shop));
      localStorage.setItem(ACTIVE_SHOP_ID_KEY, shop.id);
    }
  }

  async function refreshShop() {
    if (currentShop) {
      const refreshed = await db.getShopById(currentShop.id);
      if (refreshed) {
        setCurrentShop(refreshed);
        localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(refreshed));
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentShop,
        allUserShops,
        isLoading,
        login,
        registerShop,
        resetPassword,
        logout,
        switchShop,
        refreshShop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
