-- ==============================================================================
-- 0002_storage_and_rls.sql: Row Level Security & Private Storage Setup
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- 2. HELPER FUNCTION: Check if auth user is member of shop
CREATE OR REPLACE FUNCTION public.is_shop_member(target_shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.shop_members
        WHERE shop_id = target_shop_id
        AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.shops
        WHERE id = target_shop_id
        AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. SHOPS POLICIES
-- Public can view active shop for customer ordering
CREATE POLICY "Public can view active shops"
    ON public.shops FOR SELECT
    USING (is_active = true);

-- Shop owner can update shop
CREATE POLICY "Shop owners can update own shop"
    ON public.shops FOR UPDATE
    USING (owner_id = auth.uid() OR public.is_shop_member(id));

-- 5. PRICING RULES POLICIES
-- Anyone can view pricing rules for active shops (to show pricing on customer page)
CREATE POLICY "Public can view pricing rules"
    ON public.pricing_rules FOR SELECT
    USING (TRUE);

CREATE POLICY "Shop members can manage pricing rules"
    ON public.pricing_rules FOR ALL
    USING (public.is_shop_member(shop_id));

-- 6. SHOP SERVICES POLICIES
CREATE POLICY "Public can view active shop services"
    ON public.shop_services FOR SELECT
    USING (is_active = true);

CREATE POLICY "Shop members can manage shop services"
    ON public.shop_services FOR ALL
    USING (public.is_shop_member(shop_id));

-- 7. CUSTOMERS POLICIES
-- Customers can be created by guest users placing orders
CREATE POLICY "Public can create customer record"
    ON public.customers FOR INSERT
    WITH CHECK (TRUE);

-- Shop members can view customers of their shop
CREATE POLICY "Shop members can view their customers"
    ON public.customers FOR SELECT
    USING (public.is_shop_member(shop_id));

-- 8. ORDERS POLICIES
-- Guest customer can insert a new order
CREATE POLICY "Anyone can create an order"
    ON public.orders FOR INSERT
    WITH CHECK (TRUE);

-- Shop members can view orders for their shop
CREATE POLICY "Shop members can view own shop orders"
    ON public.orders FOR SELECT
    USING (public.is_shop_member(shop_id));

-- Shop members can update orders for their shop
CREATE POLICY "Shop members can update own shop orders"
    ON public.orders FOR UPDATE
    USING (public.is_shop_member(shop_id));

-- 9. ORDER ITEMS POLICIES
CREATE POLICY "Anyone can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Shop members can view order items"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND public.is_shop_member(orders.shop_id)
        )
    );

-- 10. FILES POLICIES
CREATE POLICY "Anyone can insert files during order"
    ON public.files FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Shop members can view shop files"
    ON public.files FOR SELECT
    USING (public.is_shop_member(shop_id));

-- 11. ORDER STATUS HISTORY (Immutable)
CREATE POLICY "Anyone can insert status history"
    ON public.order_status_history FOR INSERT
    WITH CHECK (TRUE);

CREATE POLICY "Shop members can view status history"
    ON public.order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_status_history.order_id
            AND public.is_shop_member(orders.shop_id)
        )
    );

-- 12. SHOP SETTINGS POLICIES
CREATE POLICY "Public can view basic shop settings"
    ON public.shop_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Shop members can manage shop settings"
    ON public.shop_settings FOR ALL
    USING (public.is_shop_member(shop_id));

-- 13. SECURE VERIFICATION RPC FOR CUSTOMER ORDER TRACKING
-- Customer must provide order_number AND matching phone number to view order details
CREATE OR REPLACE FUNCTION public.track_customer_order(
    p_order_number TEXT,
    p_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order JSONB;
BEGIN
    SELECT jsonb_build_object(
        'order', row_to_json(o),
        'customer', row_to_json(c),
        'shop', jsonb_build_object('shop_name', s.shop_name, 'phone', s.phone, 'whatsapp_number', s.whatsapp_number, 'address', s.address),
        'items', (
            SELECT jsonb_agg(row_to_json(oi))
            FROM public.order_items oi
            WHERE oi.order_id = o.id
        ),
        'files', (
            SELECT jsonb_agg(row_to_json(f))
            FROM public.files f
            WHERE f.order_id = o.id
        ),
        'history', (
            SELECT jsonb_agg(row_to_json(h) ORDER BY h.timestamp ASC)
            FROM public.order_status_history h
            WHERE h.order_id = o.id
        )
    )
    INTO v_order
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    JOIN public.shops s ON s.id = o.shop_id
    WHERE o.order_number = UPPER(TRIM(p_order_number))
      AND RIGHT(REGEXP_REPLACE(c.phone, '\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(p_phone, '\D', '', 'g'), 10);

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. PUBLIC STORAGE BUCKET CONFIGURATION
-- Ensure order-documents bucket exists and allows public document access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'order-documents',
    'order-documents',
    true,
    26214400, -- 25MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 26214400;

-- 15. STORAGE OBJECTS POLICIES (Allows mobile customers to upload documents)
DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
CREATE POLICY "Public Uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Public Select" ON storage.objects;
CREATE POLICY "Public Select" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'order-documents');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'order-documents');

