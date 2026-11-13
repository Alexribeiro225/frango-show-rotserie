import { withComboAvailability } from "@/lib/inventory";

export type Product = { id: number; category: string; name: string; price: number; description: string; image_url: string; is_popular: boolean; is_active: boolean; stock_quantity: number | null };
export type ComboComponent = { combo_product_id: number; component_product_id: number; quantity_per_combo: number };
export type Promo = { id: number; title: string; description: string; image_url: string | null; starts_at: string | null; ends_at: string | null; is_active: boolean };
export type Announcement = { id: number; title: string; body: string; image_url: string | null; is_active: boolean };

const url = import.meta.env["VITE_SUPABASE_URL"]?.replace(/\/$/, "");
const anon = import.meta.env["VITE_SUPABASE_ANON_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
export const configured = Boolean(url && anon);
const storageKey = "frango-show-admin-session";
export type AppUser = { id: string; email?: string; role: "master" | "owner"; subscriptionStatus: string; hasAccess: boolean; trialEndsAt: string | null; isBlocked: boolean };
export type SaaSPlan = { id: number; name: string; description: string; price: number; billing_interval: string; checkout_url: string; kiwify_product_id: string | null; features: string[]; is_active: boolean; sort_order: number };
type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };
const getSession = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
};
const saveSession = (session: Session | null) => session ? localStorage.setItem(storageKey, JSON.stringify(session)) : localStorage.removeItem(storageKey);
async function authFetch(path: string, init: RequestInit = {}, token?: string) {
  if (!configured) throw new Error("Configure o Supabase para ativar o painel.");
  const response = await fetch(url + path, { ...init, headers: { apikey: anon!, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || "Não foi possível concluir a operação.");
  return data;
}
export async function signIn(email: string, password: string): Promise<AppUser> {
  const data = await authFetch("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user };
  saveSession(session);
  const user = await currentUser();
  if (!user) throw new Error("Não foi possível validar o acesso desta conta.");
  return user;
}
export async function signUpForPlan(email: string, password: string, planId: number) {
  const data = await authFetch("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { saas_plan_id: planId } }) });
  if (data.access_token && data.refresh_token && data.user) {
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user });
  }
  return { email: data.user?.email || email, confirmationRequired: !data.access_token };
}
export function signOut() { saveSession(null); }
async function token() {
  let session = getSession();
  if (!session) throw new Error("Entre novamente para continuar.");
  if (session.expires_at < Date.now() + 60_000) {
    const data = await authFetch("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }) });
    session = { access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user };
    saveSession(session);
  }
  return session.access_token;
}
export async function currentUser(): Promise<AppUser | null> {
  const session = getSession();
  if (!session?.user?.id) return null;
  try {
    const access = await token();
    const email = session.user.email || "";
    if (email.toLowerCase() === "conectstore.app@gmail.com") return { id: session.user.id, email, role: "master", subscriptionStatus: "active", hasAccess: true, trialEndsAt: null, isBlocked: false };
    const rows = await authFetch("/rest/v1/saas_subscriptions?select=status,trial_ends_at,is_blocked,current_period_end&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {}, access) as Array<{ status: string; trial_ends_at: string | null; is_blocked: boolean; current_period_end: string | null }>;
    const row = rows[0];
    const status = row?.status || "pending";
    const now = Date.now();
    const isBlocked = Boolean(row?.is_blocked);
    const trialEndsAt = row?.trial_ends_at || null;
    const hasAccess = !isBlocked && ((status === "active" && (!row?.current_period_end || new Date(row.current_period_end).getTime() > now)) || (status === "trial" && !!trialEndsAt && new Date(trialEndsAt).getTime() > now));
    return { id: session.user.id, email, role: "owner", subscriptionStatus: status, hasAccess, trialEndsAt, isBlocked };
  } catch { saveSession(null); return null; }
}
export function trialDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));
}
export async function isEmailRegistered(email: string) {
  return Boolean(await authFetch("/rest/v1/rpc/email_registered", { method: "POST", body: JSON.stringify({ p_email: email }) }));
}
export async function signUpTrial(email: string, password: string) {
  const data = await authFetch("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password }) });
  if (data.access_token && data.refresh_token && data.user) {
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user });
  }
  return { confirmationRequired: !data.access_token };
}
export async function accessToken() { return token(); }
export type ManagedUser = { user_id: string; customer_email: string; status: string; trial_ends_at: string | null; is_blocked: boolean; created_at: string };
export async function listManagedUsers() {
  return rest("saas_subscriptions", "?select=user_id,customer_email,status,trial_ends_at,is_blocked,created_at&order=created_at.desc") as Promise<ManagedUser[]>;
}
export async function updateManagedUser(userId: string, patch: Partial<Pick<ManagedUser, "status" | "trial_ends_at" | "is_blocked">>) {
  return rest("saas_subscriptions", "?user_id=eq." + encodeURIComponent(userId), { method: "PATCH", body: JSON.stringify(patch) });
}
const masterBackupKey = "frango-show-master-backup";
export async function enterAsUser(tokenHash: string) {
  const backup = localStorage.getItem(storageKey);
  const data = await authFetch("/auth/v1/verify", { method: "POST", body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }) });
  if (backup) localStorage.setItem(masterBackupKey, backup);
  saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: Date.now() + Number(data.expires_in || 3600) * 1000, user: data.user });
}
export function isImpersonating() { return typeof localStorage !== "undefined" && !!localStorage.getItem(masterBackupKey); }
export function returnToMaster() {
  const backup = localStorage.getItem(masterBackupKey);
  if (backup) localStorage.setItem(storageKey, backup);
  localStorage.removeItem(masterBackupKey);
}
export async function getMySubscription() {
  const access = await token();
  const session = getSession()!;
  const rows = await authFetch("/rest/v1/saas_subscriptions?select=status,plan_id&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1", {}, access) as Array<{ status: string; plan_id: number | null }>;
  const subscription = rows[0];
  if (!subscription?.plan_id) return { status: subscription?.status || "pending", checkout_url: null as string | null };
  const plans = await authFetch("/rest/v1/saas_plans?select=checkout_url&id=eq." + subscription.plan_id + "&limit=1", {}, access) as Array<{ checkout_url: string }>;
  return { status: subscription.status, checkout_url: plans[0]?.checkout_url || null };
}
async function rest(table: string, query = "", init: RequestInit = {}) {
  const access = await token();
  return authFetch(`/rest/v1/${table}${query}`, { ...init, headers: { Prefer: "return=representation", ...init.headers } }, access);
}
export async function loadPublicContent() {
  if (!configured) return null;
  try {
    const [products, promos, announcements, components] = await Promise.all([
      authFetch("/rest/v1/products?select=id,category,name,price,description,image_url,is_popular,is_active,stock_quantity&is_active=eq.true&order=sort_order.asc"),
      authFetch("/rest/v1/promotions?select=id,title,description,image_url,starts_at,ends_at,is_active&is_active=eq.true"),
      authFetch("/rest/v1/announcements?select=id,title,body,image_url,is_active&is_active=eq.true"),
      authFetch("/rest/v1/combo_components?select=combo_product_id,component_product_id,quantity_per_combo"),
    ]);
    const productRows = products as Product[];
    const componentRows = components as ComboComponent[];
    const productsWithAvailability = withComboAvailability(productRows, componentRows);
    return { products: productsWithAvailability, promos: promos as Promo[], announcements: announcements as Announcement[] };
  } catch { return null; }
}
export async function listRows(table: "products" | "promotions" | "announcements") {
  if (table !== "products") return rest(table, "?select=*&order=created_at.desc");
  const [products, components] = await Promise.all([
    rest(table, "?select=*&order=created_at.desc") as Promise<Product[]>,
    rest("combo_components", "?select=combo_product_id,component_product_id,quantity_per_combo") as Promise<ComboComponent[]>,
  ]);
  return withComboAvailability(products, components);
}
export async function listActivePlans() {
  return authFetch("/rest/v1/saas_plans?select=id,name,description,price,billing_interval,checkout_url,kiwify_product_id,features,is_active,sort_order&is_active=eq.true&order=sort_order.asc") as Promise<SaaSPlan[]>;
}
export async function listPlans() { return rest("saas_plans", "?select=*&order=sort_order.asc") as Promise<SaaSPlan[]>; }
export async function savePlan(row: Partial<SaaSPlan>, id?: number) {
  return rest("saas_plans", id ? "?id=eq." + id : "", { method: id ? "PATCH" : "POST", body: JSON.stringify(row) });
}
export async function deletePlan(id: number) { return rest("saas_plans", "?id=eq." + id, { method: "DELETE" }); }
export async function listComboComponents(comboProductId: number) {
  return rest("combo_components", `?select=combo_product_id,component_product_id,quantity_per_combo&combo_product_id=eq.${comboProductId}&order=component_product_id.asc`) as Promise<ComboComponent[]>;
}
export async function saveComboComponents(comboProductId: number, components: Array<{ product_id: number; quantity: number }>) {
  const access = await token();
  return authFetch("/rest/v1/rpc/save_combo_components", { method: "POST", body: JSON.stringify({ p_combo_product_id: comboProductId, p_components: components }) }, access);
}
export async function saveRow(table: "products" | "promotions" | "announcements", row: Record<string, unknown>, id?: number) {
  return rest(table, id ? `?id=eq.${id}` : "", { method: id ? "PATCH" : "POST", body: JSON.stringify(row) });
}
export async function deleteRow(table: "products" | "promotions" | "announcements", id: number) {
  return rest(table, `?id=eq.${id}`, { method: "DELETE" });
}
export async function uploadImage(file: File) {
  const access = await token();
  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${Date.now()}-${safeName}`;
  const response = await fetch(`${url}/storage/v1/object/site-images/${path}`, { method: "POST", headers: { apikey: anon!, Authorization: `Bearer ${access}`, "Content-Type": file.type, "x-upsert": "false" }, body: file });
  if (!response.ok) throw new Error("Falha ao enviar imagem. Verifique o bucket e as permissões.");
  return `${url}/storage/v1/object/public/site-images/${path}`;
}

export type OrderComponent = { product_id: number; name: string; quantity: number };
export type OrderItem = { product_id: number; name: string; category: string; description?: string; components?: OrderComponent[]; quantity: number; unit_price: number; line_total: number };
export type KitchenOrder = {
  id: number; created_at: string; customer_name: string; customer_phone: string;
  fulfillment: "delivery" | "pickup" | "counter"; address: Record<string, string>;
  payment_method: string; notes: string; items: OrderItem[];
  subtotal: number; delivery_fee: number | null; total: number;
  status: "new" | "preparing" | "ready" | "completed" | "cancelled";
  paid_at?: string | null; picked_up_at?: string | null;
};
export async function createOrder(input: {
  customer_name: string; customer_phone: string; fulfillment: "delivery" | "pickup";
  address: Record<string, string>; payment_method: string; notes: string;
  items: Array<{ product_id: number; quantity: number }>;
}) {
  return authFetch("/rest/v1/rpc/create_order", { method: "POST", body: JSON.stringify({
    p_customer_name: input.customer_name, p_customer_phone: input.customer_phone,
    p_fulfillment: input.fulfillment, p_address: input.address,
    p_payment_method: input.payment_method, p_notes: input.notes, p_items: input.items,
  }) }) as Promise<{ id: number; order_number: number; items: OrderItem[]; subtotal: number; delivery_fee: number | null; total: number }>;
}
export async function listOrders(range?: { start: Date; end: Date }) {
  const filter = range ? "&created_at=gte." + encodeURIComponent(range.start.toISOString()) + "&created_at=lt." + encodeURIComponent(range.end.toISOString()) + "&limit=5000" : "&limit=100";
  return rest("orders", "?select=*&order=created_at.desc" + filter) as Promise<KitchenOrder[]>;
}
export async function updateOrderStatus(id: number, status: KitchenOrder["status"]) {
  return rest("orders", `?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}
export async function setOrderFlag(id: number, flag: "paid_at" | "picked_up_at", on: boolean) {
  return rest("orders", `?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ [flag]: on ? new Date().toISOString() : null }) });
}

export type CounterSaleDetails = {
  customer: CounterCustomer;
  fulfillment: "counter" | "delivery";
  address: { street: string; number: string };
};
export type CounterCustomer = { name: string; phone: string };
export function counterSalePayload(payment_method: string, items: Array<{ product_id: number; quantity: number }>, details: CounterSaleDetails) {
  return {
    p_payment_method: payment_method,
    p_items: items,
    p_customer_name: details.customer.name.trim(),
    p_customer_phone: details.customer.phone.trim(),
    p_fulfillment: details.fulfillment,
    p_address: details.fulfillment === "delivery" ? { street: details.address.street.trim(), number: details.address.number.trim() } : {},
  };
}
export async function createCounterSale(payment_method: string, items: Array<{ product_id: number; quantity: number }>, details: CounterSaleDetails) {
  return rest("rpc/create_counter_sale", "", {
    method: "POST",
    body: JSON.stringify(counterSalePayload(payment_method, items, details)),
  }) as Promise<{ id: number; order_number: number; items: OrderItem[]; subtotal: number; total: number; payment_method: string }>;
}

export async function deleteOrdersInRange(range: { start: Date; end: Date }) {
  return rest("rpc/delete_orders_in_range", "", { method: "POST", body: JSON.stringify({ p_start: range.start.toISOString(), p_end: range.end.toISOString() }) }) as Promise<number>;
}

export async function deleteOrdersByIds(ids: number[]) {
  if (!ids.length) return 0;
  return rest("rpc/delete_orders_by_ids", "", { method: "POST", body: JSON.stringify({ p_ids: ids }) }) as Promise<number>;
}
