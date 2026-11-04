-- Direct order writes (status, paid, picked-up) were blocked: the table had no UPDATE privilege
-- for authenticated, so the panel's PATCH failed with "permission denied for table orders".
GRANT UPDATE ON public.orders TO authenticated;

-- The old "Master is platform management not fulfillment roles" policy granted every non-master
-- signed-in user read/update/delete over EVERY store's orders. Once the UPDATE privilege exists that
-- becomes a real cross-store hole, so it is replaced by store-scoped policies below.
DROP POLICY IF EXISTS "Master is platform management not fulfillment roles" ON public.orders;
DROP POLICY IF EXISTS "Store users read orders" ON public.orders;
DROP POLICY IF EXISTS "Store users update orders" ON public.orders;

-- A store sees its own orders; the master admin sees every store's orders for platform management.
CREATE POLICY "Store users read orders" ON public.orders FOR SELECT TO authenticated
  USING (owner_id IS NOT DISTINCT FROM public.current_store_owner() OR public.is_superadmin());

-- Only the store that owns an order, and only while its subscription is usable, may change it.
CREATE POLICY "Store users update orders" ON public.orders FOR UPDATE TO authenticated
  USING (owner_id IS NOT DISTINCT FROM public.current_store_owner() AND public.has_active_saas_subscription())
  WITH CHECK (owner_id IS NOT DISTINCT FROM public.current_store_owner() AND public.has_active_saas_subscription());