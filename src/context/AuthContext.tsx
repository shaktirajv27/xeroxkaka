import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shop, Profile } from '../types/database';
import { db, generateUUID, REAL_PRINTSETU_SHOP } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_PRICING_RULES, DEFAULT_SERVICES } from '../lib/priceEngine';

const CACHED_USER_KEY = 'xeroxflow_cached_user';
const CACHED_SHOP_KEY = 'xeroxflow_cached_shop';
const CACHED_ALL_SHOPS_KEY = 'xeroxflow_cached_all_shops';
const ACTIVE_SHOP_ID_KEY = 'xeroxflow_active_shop_id';

function isDummyShopData(s: any): boolean {
  if (!s) return false;
  return (
    s.id === 'a0000000-0000-0000-0000-000000000001' ||
    s.id === 'b0000000-0000-0000-0000-000000000002' ||
    s.slug === 'abc-xerox' ||
    s.slug === 'quickprint' ||
    (typeof s.shop_name === 'string' && (s.shop_name.includes('ABC Xerox') || s.shop_name.includes('QuickPrint')))
  );
}

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
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.email === 'owner@abcxerox.com' || u?.email === 'owner@quickprint.com') {
          localStorage.removeItem(CACHED_USER_KEY);
          return null;
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [currentShop, setCurrentShop] = useState<Shop | null>(() => {
    try {
      const saved = localStorage.getItem(CACHED_SHOP_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (isDummyShopData(s)) {
          localStorage.removeItem(CACHED_SHOP_KEY);
          return REAL_PRINTSETU_SHOP;
        }
        return s;
      }
      return REAL_PRINTSETU_SHOP;
    } catch {
      return REAL_PRINTSETU_SHOP;
    }
  });

  const [allUserShops, setAllUserShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem(CACHED_ALL_SHOPS_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        const filtered = Array.isArray(list) ? list.filter((s) => !isDummyShopData(s)) : [];
        return filtered.length > 0 ? filtered : [REAL_PRINTSETU_SHOP];
      }
      return [REAL_PRINTSETU_SHOP];
    } catch {
      return [REAL_PRINTSETU_SHOP];
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
      const shops = await db.getAllShops();
      const validShops = shops.filter((s) => !isDummyShopData(s));
      const activeList = validShops.length > 0 ? validShops : [REAL_PRINTSETU_SHOP];
      setAllUserShops(activeList);
      const match = activeList[0];
      setCurrentShop(match);
      localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(match));
      localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(activeList));
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Active user session verified
        const [profileRes, ownerShopsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('shops').select('*').eq('owner_id', session.user.id).eq('is_active', true),
        ]);

        const verifiedProfile: Profile = profileRes.data || {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || 'Pratapbhai Vala',
          email: session.user.email || '',
          phone: session.user.user_metadata?.phone || '9978770883',
          role: 'shop_owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        let myShops: Shop[] = ((ownerShopsRes.data as Shop[]) || []).filter((s) => !isDummyShopData(s));
        
        // Fallback for pre-existing shops matching owner email
        if (myShops.length === 0 && session.user.email) {
          const { data: emailShops } = await supabase
            .from('shops')
            .select('*')
            .eq('email', session.user.email)
            .eq('is_active', true);
          if (emailShops && emailShops.length > 0) {
            myShops = (emailShops as Shop[]).filter((s) => !isDummyShopData(s));
            if (myShops.length > 0) {
              await supabase
                .from('shops')
                .update({ owner_id: session.user.id })
                .eq('id', myShops[0].id);
            }
          }
        }

        // If user still has no shop, query any active shops from Supabase
        if (myShops.length === 0) {
          const liveAll = await db.getAllShops();
          const cleanLive = liveAll.filter((s) => !isDummyShopData(s));
          if (cleanLive.length > 0) {
            myShops = cleanLive;
          } else {
            myShops = [REAL_PRINTSETU_SHOP];
          }
        }

        const savedShopId = localStorage.getItem(ACTIVE_SHOP_ID_KEY);
        const resolvedShop =
          myShops.find((s) => s.id === savedShopId) ||
          myShops[0] ||
          REAL_PRINTSETU_SHOP;

        setUser(verifiedProfile);
        setAllUserShops(myShops);
        setCurrentShop(resolvedShop);

        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(verifiedProfile));
        localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(resolvedShop));
        localStorage.setItem(ACTIVE_SHOP_ID_KEY, resolvedShop.id);
        localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(myShops));
      } else {
        // No active Supabase session
        setUser(null);
        // Keep real print shop available for customer storefront browsing
        setCurrentShop(REAL_PRINTSETU_SHOP);
        setAllUserShops([REAL_PRINTSETU_SHOP]);
        localStorage.removeItem(CACHED_USER_KEY);
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
          const [profileRes, ownerShopsRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('user_id', authData.user.id).maybeSingle(),
            supabase.from('shops').select('*').eq('owner_id', authData.user.id).eq('is_active', true),
          ]);

          const profile: Profile = profileRes.data || {
            id: authData.user.id,
            full_name: authData.user.user_metadata?.full_name || 'Pratapbhai Vala',
            email: authData.user.email || email,
            phone: authData.user.user_metadata?.phone || '9978770883',
            role: 'shop_owner',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          let myShops: Shop[] = ((ownerShopsRes.data as Shop[]) || []).filter((s) => !isDummyShopData(s));
          if (myShops.length === 0 && authData.user.email) {
            const { data: emailShops } = await supabase
              .from('shops')
              .select('*')
              .eq('email', authData.user.email)
              .eq('is_active', true);
            if (emailShops && emailShops.length > 0) {
              myShops = (emailShops as Shop[]).filter((s) => !isDummyShopData(s));
              if (myShops.length > 0) {
                await supabase
                  .from('shops')
                  .update({ owner_id: authData.user.id })
                  .eq('id', myShops[0].id);
              }
            }
          }

          if (myShops.length === 0) {
            const liveAll = await db.getAllShops();
            const cleanLive = liveAll.filter((s) => !isDummyShopData(s));
            if (cleanLive.length > 0) {
              myShops = cleanLive;
            } else {
              myShops = [REAL_PRINTSETU_SHOP];
            }
          }

          const matchedShop = myShops[0] || REAL_PRINTSETU_SHOP;

          setUser(profile);
          setAllUserShops(myShops);
          setCurrentShop(matchedShop);

          localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
          localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(matchedShop));
          localStorage.setItem(ACTIVE_SHOP_ID_KEY, matchedShop.id);
          localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify(myShops));
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
        setAllUserShops([newShop]);

        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(profile));
        localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(newShop));
        localStorage.setItem(ACTIVE_SHOP_ID_KEY, newShop.id);
        localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify([newShop]));
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
      setAllUserShops([newShop]);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(newProfile));
      localStorage.setItem(CACHED_SHOP_KEY, JSON.stringify(newShop));
      localStorage.setItem(ACTIVE_SHOP_ID_KEY, newShop.id);
      localStorage.setItem(CACHED_ALL_SHOPS_KEY, JSON.stringify([newShop]));
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
    setCurrentShop(REAL_PRINTSETU_SHOP);
    setAllUserShops([REAL_PRINTSETU_SHOP]);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_SHOP_KEY);
    localStorage.removeItem(ACTIVE_SHOP_ID_KEY);
    localStorage.removeItem(CACHED_ALL_SHOPS_KEY);
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
