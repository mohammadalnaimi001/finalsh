import {
  AlertCircle,
  Ban,
  BarChart3,
  CheckCheck,
  Clock,
  DollarSign,
  Globe,
  ImagePlus,
  Languages,
  LoaderCircle,
  LogOut,
  Package,
  RefreshCw,
  Save,
  Search,
  Shield,
  Store,
  Trash2,
  TrendingUp,
  UserCog,
  Users
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND } from "../data";
import { useStore } from "../store";

type AdminBootstrap = {
  metrics: {
    products: number;
    orders: number;
    customers: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    totalRevenueJod: number;
  };
  products: ProductRow[];
  orders: OrderRow[];
  customers: CustomerRow[];
  settings: Record<string, unknown>;
  content: Record<string, unknown>;
  translations: TranslationRow[];
};

type ProductRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  collection_en: string;
  collection_ar: string;
  price_jod: number | string;
  discount_price_jod: number | string | null;
  stock_quantity: number;
  concentration: string;
  gender: "Feminine" | "Masculine" | "Unisex";
  featured: boolean;
  published: boolean;
  image_urls: string[] | string;
  image_gradient: string;
  notes: { top: string[]; heart: string[]; base: string[] } | string;
};

type OrderRow = {
  id: string;
  status: "pending" | "processing" | "delivered" | "cancelled";
  payment_method: "card" | "cod";
  total_jod: number | string;
  subtotal_jod: number | string;
  delivery_jod: number | string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  created_at: string;
};

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_banned: boolean;
  order_count: number | string;
  created_at: string;
};

type TranslationRow = { key: string; en: string; ar: string };

type ProductForm = {
  slug: string;
  nameEn: string;
  nameAr: string;
  collectionEn: string;
  collectionAr: string;
  categoryEn: string;
  categoryAr: string;
  concentration: string;
  gender: "Feminine" | "Masculine" | "Unisex";
  priceJod: number;
  discountPriceJod: number | null;
  stockQuantity: number;
  featured: boolean;
  published: boolean;
  auraEn: string;
  auraAr: string;
  descriptionEn: string;
  descriptionAr: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  tags: string[];
  mood: string[];
  rating: number;
  reviewCount: number;
  imageGradient: string;
  imageUrls: string[];
};

const emptyProduct: ProductForm = {
  slug: "",
  nameEn: "",
  nameAr: "",
  collectionEn: "",
  collectionAr: "",
  categoryEn: "",
  categoryAr: "",
  concentration: "Eau de Parfum",
  gender: "Unisex",
  priceJod: 0,
  discountPriceJod: null,
  stockQuantity: 0,
  featured: false,
  published: true,
  auraEn: "",
  auraAr: "",
  descriptionEn: "",
  descriptionAr: "",
  notes: { top: [], heart: [], base: [] },
  tags: [],
  mood: [],
  rating: 4.8,
  reviewCount: 0,
  imageGradient: "linear-gradient(145deg,#0b0b0a,#322313 48%,#c9a258)",
  imageUrls: []
};

const tabs = [
  { id: "overview",      label: "Overview",      icon: BarChart3  },
  { id: "products",      label: "Products",      icon: Package    },
  { id: "orders",        label: "Orders",        icon: CheckCheck },
  { id: "customers",     label: "Customers",     icon: Users      },
  { id: "content",       label: "Content",       icon: Globe      },
  { id: "branding",      label: "Branding",      icon: ImagePlus  },
  { id: "translations",  label: "Translations",  icon: Languages  },
  { id: "security",      label: "Security",      icon: Shield     }
] as const;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "sp-badge sp-badge-pending"    },
  processing: { label: "Processing", cls: "sp-badge sp-badge-processing" },
  delivered:  { label: "Delivered",  cls: "sp-badge sp-badge-delivered"  },
  cancelled:  { label: "Cancelled",  cls: "sp-badge sp-badge-cancelled"  },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: "sp-badge" };
  return <span className={meta.cls}>{meta.label}</span>;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  if (value == null) return fallback;
  return value as T;
}

function toProductForm(row: ProductRow): ProductForm {
  const notes = parseJsonField(row.notes, { top: [], heart: [], base: [] });
  const imageUrls = parseJsonField<string[]>(row.image_urls, []);
  return {
    slug: row.slug,
    nameEn: row.name_en,
    nameAr: row.name_ar,
    collectionEn: row.collection_en,
    collectionAr: row.collection_ar,
    categoryEn: row.category_en,
    categoryAr: row.category_ar,
    concentration: row.concentration,
    gender: row.gender,
    priceJod: Number(row.price_jod),
    discountPriceJod: row.discount_price_jod == null ? null : Number(row.discount_price_jod),
    stockQuantity: Number(row.stock_quantity),
    featured: row.featured,
    published: row.published,
    auraEn: (row as unknown as Record<string, string>).aura_en ?? "",
    auraAr: (row as unknown as Record<string, string>).aura_ar ?? "",
    descriptionEn: (row as unknown as Record<string, string>).description_en ?? "",
    descriptionAr: (row as unknown as Record<string, string>).description_ar ?? "",
    notes,
    tags: parseJsonField<string[]>((row as unknown as Record<string, unknown>).tags ?? [], []),
    mood: parseJsonField<string[]>((row as unknown as Record<string, unknown>).mood ?? [], []),
    rating: Number((row as unknown as Record<string, unknown>).rating ?? 4.8),
    reviewCount: Number((row as unknown as Record<string, unknown>).review_count ?? 0),
    imageGradient: row.image_gradient,
    imageUrls
  };
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export default function AdminPanel() {
  const { setLogoAssets } = useStore();
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem("shakra-admin-token"); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "err" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const [bootstrap, setBootstrap] = useState<AdminBootstrap | null>(null);
  const [email, setEmail] = useState(adminEmailGuess());
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [contentDraft, setContentDraft] = useState<Record<string, unknown>>({});
  const [settingsDraft, setSettingsDraft] = useState<Record<string, unknown>>({});
  const [translationDraft, setTranslationDraft] = useState<TranslationRow[]>([]);

  function notify(msg: string, type: "ok" | "err" = "ok") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }

  const api = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      }
    });
    const payload = await readJsonSafe<{ error?: string } & T>(response);
    if (!payload) throw new Error("Invalid JSON response from server.");
    if (!response.ok) throw new Error(payload.error ?? "Request failed");
    return payload;
  }, [token]);

  const loadBootstrap = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const payload = await api<AdminBootstrap>("/api/admin/bootstrap");
      setBootstrap(payload);
      setContentDraft(payload.content ?? {});
      setSettingsDraft(payload.settings ?? {});
      setTranslationDraft(payload.translations ?? []);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load dashboard.", "err");
    } finally {
      setLoading(false);
    }
  }, [api, token]);

  useEffect(() => { void loadBootstrap(); }, [loadBootstrap]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = await api<{ token: string }>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(payload.token);
      localStorage.setItem("shakra-admin-token", payload.token);
      notify("Welcome back. Dashboard unlocked.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Login failed.", "err");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setBootstrap(null);
    localStorage.removeItem("shakra-admin-token");
  }

  async function saveProduct() {
    const method = activeProductId ? "PUT" : "POST";
    const path = activeProductId ? `/api/admin/products/${activeProductId}` : "/api/admin/products";
    setLoading(true);
    try {
      await api(path, { method, body: JSON.stringify(productForm) });
      notify(activeProductId ? "Product updated." : "Product created.");
      setProductForm(emptyProduct);
      setActiveProductId(null);
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save product.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product permanently?")) return;
    setLoading(true);
    try {
      await api(`/api/admin/products/${id}`, { method: "DELETE" });
      notify("Product deleted.");
      if (activeProductId === id) { setActiveProductId(null); setProductForm(emptyProduct); }
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete product.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderRow["status"]) {
    setLoading(true);
    try {
      await api(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      notify(`Order moved to ${status}.`);
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update order.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function setCustomerBan(id: string, isBanned: boolean) {
    setLoading(true);
    try {
      await api(`/api/admin/customers/${id}/ban`, { method: "PATCH", body: JSON.stringify({ isBanned }) });
      notify(isBanned ? "Customer access restricted." : "Customer access restored.");
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not update customer.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Delete this customer record?")) return;
    setLoading(true);
    try {
      await api(`/api/admin/customers/${id}`, { method: "DELETE" });
      notify("Customer deleted.");
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not delete customer.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function saveContent() {
    setLoading(true);
    try {
      await api("/api/admin/content", { method: "PUT", body: JSON.stringify(contentDraft) });
      notify("Website content updated.");
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save content.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setLoading(true);
    try {
      await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(settingsDraft) });
      const full = String(settingsDraft.logoFullUrl ?? "");
      const mark = String(settingsDraft.logoMarkUrl ?? full);
      if (full) setLogoAssets(full, mark);
      notify("Brand settings applied.");
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save settings.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function saveTranslations() {
    setLoading(true);
    try {
      await api("/api/admin/translations", { method: "PUT", body: JSON.stringify(translationDraft) });
      notify("Translations saved.");
      await loadBootstrap();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save translations.", "err");
    } finally {
      setLoading(false);
    }
  }

  async function uploadAsset(file: File) {
    if (!token) throw new Error("Admin token is missing.");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const payload = await readJsonSafe<{ error?: string; url?: string }>(response);
    if (!payload) throw new Error("Invalid upload response.");
    if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
    return String(payload.url);
  }

  /* ── Login Screen ───────────────────────────────────────────── */
  if (!token) {
    return (
      <main className="page page-enter sp-login-bg">
        <section className="admin-shell admin-login-shell glass sp-login-card">
          <div className="sp-login-head">
            <img
              className="logo-img-dark"
              src="/assets/logo-icon.png"
              alt="Shakra Perfume"
              style={{ height: 64, width: "auto", marginBottom: "0.5rem" }}
            />
            <h1 style={{ fontSize: "1.6rem", marginBottom: "0.25rem" }}>Admin Dashboard</h1>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>Shakra Perfume — Management Console</p>
          </div>

          <form className="admin-form-grid" onSubmit={login} style={{ marginTop: "1.5rem" }}>
            <label>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="username" />
            </label>
            <label>
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" />
            </label>
            <button type="submit" className="primary-button full" disabled={loading} style={{ marginTop: "0.4rem" }}>
              {loading ? <><LoaderCircle size={16} className="spin" /> Signing in…</> : "Sign in to Dashboard"}
            </button>
            <p className="admin-note" style={{ textAlign: "center", marginTop: "0.25rem" }}>
              Credentials via <code>ADMIN_EMAIL</code> / <code>ADMIN_PASSWORD</code> env vars.
            </p>
          </form>

          <a href="/" style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block", textAlign: "center", marginTop: "1rem" }}>
            ← Return to store
          </a>
        </section>

        {toast && (
          <div className={`sp-toast ${toast.type === "err" ? "sp-toast-err" : ""}`}>
            {toast.type === "err" ? <AlertCircle size={15} /> : <CheckCheck size={15} />}
            {toast.msg}
          </div>
        )}
      </main>
    );
  }

  /* ── Filtered data ──────────────────────────────────────────── */
  const products = (bootstrap?.products ?? []).filter((row) => {
    const hay = [row.name_en, row.name_ar, row.slug, row.category_en].join(" ").toLowerCase();
    return !search || hay.includes(search.toLowerCase());
  });
  const orders = (bootstrap?.orders ?? []).filter((row) => {
    const hay = [row.id, row.customer_name, row.customer_email, row.payment_method].join(" ").toLowerCase();
    const statusOk = orderFilter === "all" || row.status === orderFilter;
    return statusOk && (!orderSearch || hay.includes(orderSearch.toLowerCase()));
  });
  const customers = (bootstrap?.customers ?? []).filter((row) => {
    const hay = [row.name, row.email, row.phone].join(" ").toLowerCase();
    return !customerSearch || hay.includes(customerSearch.toLowerCase());
  });

  const m = bootstrap?.metrics;

  /* ── Dashboard ──────────────────────────────────────────────── */
  return (
    <main className="page page-enter">
      {/* Loading bar */}
      {loading && <div className="sp-loading-bar" />}

      {/* Toast */}
      {toast && (
        <div className={`sp-toast ${toast.type === "err" ? "sp-toast-err" : ""}`}>
          {toast.type === "err" ? <AlertCircle size={15} /> : <CheckCheck size={15} />}
          {toast.msg}
        </div>
      )}

      <section className="admin-shell">
        {/* Sidebar */}
        <aside className="glass admin-sidebar sp-sidebar">
          <div className="sp-sidebar-brand">
            <img className="logo-img-dark" src="/assets/logo-icon.png" alt="Shakra" style={{ height: 36, width: "auto" }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>Shakra Admin</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Management Console</div>
            </div>
          </div>

          <div className="sp-sidebar-nav">
            {tabs.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.id}
                  className={tab === entry.id ? "admin-tab active" : "admin-tab"}
                  onClick={() => setTab(entry.id)}
                >
                  <Icon size={16} />
                  {entry.label}
                </button>
              );
            })}
          </div>

          <div className="sp-sidebar-footer">
            <button className="admin-tab" onClick={() => void loadBootstrap()}>
              <RefreshCw size={16} />
              Refresh
            </button>
            <a className="admin-tab" href="/" style={{ textDecoration: "none" }}>
              <Store size={16} />
              View Store
            </a>
            <button className="admin-tab sp-logout-btn" onClick={logout}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <section className="glass admin-content">

          {/* Overview */}
          {tab === "overview" && (
            <div key="overview" className="sp-tab-pane admin-grid">
              <MetricCard icon={<DollarSign size={20} />}  label="Revenue"    value={`${(m?.totalRevenueJod ?? 0).toLocaleString()} JOD`} accent />
              <MetricCard icon={<Package size={20} />}     label="Products"   value={String(m?.products ?? 0)} />
              <MetricCard icon={<CheckCheck size={20} />}  label="Orders"     value={String(m?.orders ?? 0)} />
              <MetricCard icon={<Users size={20} />}       label="Customers"  value={String(m?.customers ?? 0)} />
              <MetricCard icon={<Clock size={20} />}       label="Pending"    value={String(m?.pendingOrders ?? 0)} warn={Boolean(m?.pendingOrders)} />
              <MetricCard icon={<TrendingUp size={20} />}  label="Processing" value={String(m?.processingOrders ?? 0)} />
            </div>
          )}

          {/* Products */}
          {tab === "products" && (
            <div key="products" className="sp-tab-pane admin-stack">
              <div className="admin-toolbar">
                <label className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" />
                </label>
                <button className="secondary-button" onClick={() => { setActiveProductId(null); setProductForm(emptyProduct); }}>
                  + New Product
                </button>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((row) => (
                      <tr key={row.id} className="sp-tr">
                        <td><strong>{row.name_en}</strong><br /><small style={{ color: "var(--muted)" }}>{row.name_ar}</small></td>
                        <td>{row.category_en}</td>
                        <td style={{ color: "var(--gold-soft)" }}>{Number(row.price_jod)} JOD</td>
                        <td>
                          <span className={Number(row.stock_quantity) === 0 ? "sp-badge sp-badge-cancelled" : Number(row.stock_quantity) < 5 ? "sp-badge sp-badge-pending" : "sp-badge sp-badge-delivered"}>
                            {row.stock_quantity}
                          </span>
                        </td>
                        <td>
                          {row.featured && <span className="sp-badge sp-badge-processing" style={{ marginRight: "0.3rem" }}>Featured</span>}
                          {row.published ? <span className="sp-badge sp-badge-delivered">Live</span> : <span className="sp-badge sp-badge-cancelled">Draft</span>}
                        </td>
                        <td className="admin-row-actions">
                          <button onClick={() => { setActiveProductId(row.id); setProductForm(toProductForm(row)); }}>Edit</button>
                          <button className="danger" onClick={() => void deleteProduct(row.id)}><Trash2 size={13} /> Delete</button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2.5rem" }}>No products found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <section className="admin-editor">
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Package size={18} style={{ color: "var(--gold)" }} />
                  {activeProductId ? "Edit Product" : "Add New Product"}
                </h3>
                <div className="admin-form-grid two">
                  <label>Slug<input value={productForm.slug} onChange={(e) => setProductForm((d) => ({ ...d, slug: e.target.value }))} /></label>
                  <label>Concentration<input value={productForm.concentration} onChange={(e) => setProductForm((d) => ({ ...d, concentration: e.target.value }))} /></label>
                  <label>Name EN<input value={productForm.nameEn} onChange={(e) => setProductForm((d) => ({ ...d, nameEn: e.target.value }))} /></label>
                  <label>Name AR<input value={productForm.nameAr} onChange={(e) => setProductForm((d) => ({ ...d, nameAr: e.target.value }))} dir="rtl" /></label>
                  <label>Collection EN<input value={productForm.collectionEn} onChange={(e) => setProductForm((d) => ({ ...d, collectionEn: e.target.value }))} /></label>
                  <label>Collection AR<input value={productForm.collectionAr} onChange={(e) => setProductForm((d) => ({ ...d, collectionAr: e.target.value }))} dir="rtl" /></label>
                  <label>Category EN<input value={productForm.categoryEn} onChange={(e) => setProductForm((d) => ({ ...d, categoryEn: e.target.value }))} /></label>
                  <label>Category AR<input value={productForm.categoryAr} onChange={(e) => setProductForm((d) => ({ ...d, categoryAr: e.target.value }))} dir="rtl" /></label>
                  <label>Price JOD<input type="number" value={productForm.priceJod} onChange={(e) => setProductForm((d) => ({ ...d, priceJod: Number(e.target.value) }))} /></label>
                  <label>Discount Price<input type="number" value={productForm.discountPriceJod ?? ""} onChange={(e) => setProductForm((d) => ({ ...d, discountPriceJod: e.target.value ? Number(e.target.value) : null }))} /></label>
                  <label>Stock Quantity<input type="number" value={productForm.stockQuantity} onChange={(e) => setProductForm((d) => ({ ...d, stockQuantity: Number(e.target.value) }))} /></label>
                  <label>Gender
                    <select value={productForm.gender} onChange={(e) => setProductForm((d) => ({ ...d, gender: e.target.value as ProductForm["gender"] }))}>
                      <option>Unisex</option><option>Feminine</option><option>Masculine</option>
                    </select>
                  </label>
                  <label>Aura EN<textarea value={productForm.auraEn} onChange={(e) => setProductForm((d) => ({ ...d, auraEn: e.target.value }))} /></label>
                  <label>Aura AR<textarea value={productForm.auraAr} onChange={(e) => setProductForm((d) => ({ ...d, auraAr: e.target.value }))} dir="rtl" /></label>
                  <label>Description EN<textarea value={productForm.descriptionEn} onChange={(e) => setProductForm((d) => ({ ...d, descriptionEn: e.target.value }))} /></label>
                  <label>Description AR<textarea value={productForm.descriptionAr} onChange={(e) => setProductForm((d) => ({ ...d, descriptionAr: e.target.value }))} dir="rtl" /></label>
                  <label>Top Notes (comma)<input value={productForm.notes.top.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, notes: { ...d.notes, top: csv(e.target.value) } }))} /></label>
                  <label>Heart Notes (comma)<input value={productForm.notes.heart.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, notes: { ...d.notes, heart: csv(e.target.value) } }))} /></label>
                  <label>Base Notes (comma)<input value={productForm.notes.base.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, notes: { ...d.notes, base: csv(e.target.value) } }))} /></label>
                  <label>Tags (comma)<input value={productForm.tags.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, tags: csv(e.target.value) }))} /></label>
                  <label>Mood Keywords (comma)<input value={productForm.mood.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, mood: csv(e.target.value) }))} /></label>
                  <label>Image URLs (comma)<textarea value={productForm.imageUrls.join(", ")} onChange={(e) => setProductForm((d) => ({ ...d, imageUrls: csv(e.target.value) }))} /></label>
                  <label>Upload Product Image
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const url = await uploadAsset(file);
                        setProductForm((d) => ({ ...d, imageUrls: [...d.imageUrls, url] }));
                        notify("Product image uploaded.");
                      } catch (err) {
                        notify(err instanceof Error ? err.message : "Upload failed.", "err");
                      } finally { e.currentTarget.value = ""; }
                    }} />
                  </label>
                  <label>Gradient Background<input value={productForm.imageGradient} onChange={(e) => setProductForm((d) => ({ ...d, imageGradient: e.target.value }))} /></label>
                  <label className="inline-check">
                    <input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm((d) => ({ ...d, featured: e.target.checked }))} />
                    Featured
                  </label>
                  <label className="inline-check">
                    <input type="checkbox" checked={productForm.published} onChange={(e) => setProductForm((d) => ({ ...d, published: e.target.checked }))} />
                    Published
                  </label>
                </div>
                <div className="admin-actions">
                  <button className="primary-button" onClick={() => void saveProduct()}>
                    <Save size={14} /> {activeProductId ? "Update Product" : "Create Product"}
                  </button>
                  <button className="secondary-button" onClick={() => { setProductForm(emptyProduct); setActiveProductId(null); }}>
                    Reset
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* Orders */}
          {tab === "orders" && (
            <div key="orders" className="sp-tab-pane admin-stack">
              <div className="admin-toolbar">
                <label className="search-box">
                  <Search size={16} />
                  <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search orders…" />
                </label>
                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr><th>Order ID</th><th>Customer</th><th>Payment</th><th>Total</th><th>Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((row) => (
                      <tr key={row.id} className="sp-tr">
                        <td><code style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{row.id.slice(0, 8)}…</code></td>
                        <td>
                          <strong>{row.customer_name ?? "Guest"}</strong>
                          <br /><small style={{ color: "var(--muted)" }}>{row.customer_email ?? "—"}</small>
                        </td>
                        <td><span className="sp-badge sp-badge-processing">{row.payment_method.toUpperCase()}</span></td>
                        <td style={{ color: "var(--gold-soft)", fontWeight: 600 }}>{Number(row.total_jod).toFixed(2)} JOD</td>
                        <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{new Date(row.created_at).toLocaleDateString()}</td>
                        <td>
                          <select
                            className="sp-status-select"
                            value={row.status}
                            onChange={(e) => void updateOrderStatus(row.id, e.target.value as OrderRow["status"])}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2.5rem" }}>No orders found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customers */}
          {tab === "customers" && (
            <div key="customers" className="sp-tab-pane admin-stack">
              <div className="admin-toolbar">
                <label className="search-box">
                  <Search size={16} />
                  <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search customers…" />
                </label>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Orders</th><th>Phone</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {customers.map((row) => (
                      <tr key={row.id} className="sp-tr">
                        <td><strong>{row.name}</strong></td>
                        <td style={{ color: "var(--muted)" }}>{row.email}</td>
                        <td><span className="sp-badge sp-badge-processing">{Number(row.order_count)}</span></td>
                        <td style={{ color: "var(--muted)" }}>{row.phone ?? "—"}</td>
                        <td>
                          <StatusBadge status={row.is_banned ? "banned" : "active"} />
                        </td>
                        <td className="admin-row-actions">
                          <button onClick={() => void setCustomerBan(row.id, !row.is_banned)}>
                            <Ban size={13} /> {row.is_banned ? "Unban" : "Ban"}
                          </button>
                          <button className="danger" onClick={() => void deleteCustomer(row.id)}>
                            <Trash2 size={13} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "2.5rem" }}>No customers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content */}
          {tab === "content" && (
            <section key="content" className="sp-tab-pane admin-editor">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Globe size={18} style={{ color: "var(--gold)" }} /> Homepage Content
              </h3>
              <div className="admin-form-grid two">
                <label>Hero Title<input value={String(contentDraft.heroTitle ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, heroTitle: e.target.value }))} /></label>
                <label>Hero Subtitle<textarea value={String(contentDraft.heroSubtitle ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, heroSubtitle: e.target.value }))} /></label>
                <label>Banner Text<input value={String(contentDraft.bannerText ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, bannerText: e.target.value }))} /></label>
                <label>Collections Headline<input value={String(contentDraft.collectionsHeadline ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, collectionsHeadline: e.target.value }))} /></label>
                <label>Testimonial<textarea value={String(contentDraft.testimonialOne ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, testimonialOne: e.target.value }))} /></label>
                <label>Contact Email<input value={String(contentDraft.contactEmail ?? "")} onChange={(e) => setContentDraft((d) => ({ ...d, contactEmail: e.target.value }))} /></label>
                <label>Instagram URL<input value={String(contentDraft.instagramUrl ?? BRAND.instagram)} onChange={(e) => setContentDraft((d) => ({ ...d, instagramUrl: e.target.value }))} /></label>
              </div>
              <div className="admin-actions">
                <button className="primary-button" onClick={() => void saveContent()}><Save size={14} /> Save Content</button>
              </div>
            </section>
          )}

          {/* Branding */}
          {tab === "branding" && (
            <section key="branding" className="sp-tab-pane admin-editor">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ImagePlus size={18} style={{ color: "var(--gold)" }} /> Logo &amp; Brand
              </h3>
              <div className="admin-form-grid two">
                <label>Logo Full URL<input value={String(settingsDraft.logoFullUrl ?? "")} onChange={(e) => setSettingsDraft((d) => ({ ...d, logoFullUrl: e.target.value }))} /></label>
                <label>Logo Mark URL<input value={String(settingsDraft.logoMarkUrl ?? "")} onChange={(e) => setSettingsDraft((d) => ({ ...d, logoMarkUrl: e.target.value }))} /></label>
                <label>Upload Logo Full
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadAsset(file);
                      setSettingsDraft((d) => ({ ...d, logoFullUrl: url }));
                      notify("Logo uploaded.");
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Upload failed.", "err");
                    } finally { e.currentTarget.value = ""; }
                  }} />
                </label>
                <label>Upload Logo Mark
                  <input type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await uploadAsset(file);
                      setSettingsDraft((d) => ({ ...d, logoMarkUrl: url }));
                      notify("Logo mark uploaded.");
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Upload failed.", "err");
                    } finally { e.currentTarget.value = ""; }
                  }} />
                </label>
                <label>Contact Number<input value={String(settingsDraft.contactNumber ?? BRAND.phone)} onChange={(e) => setSettingsDraft((d) => ({ ...d, contactNumber: e.target.value }))} /></label>
                <label>WhatsApp URL<input value={String(settingsDraft.whatsappUrl ?? BRAND.whatsapp)} onChange={(e) => setSettingsDraft((d) => ({ ...d, whatsappUrl: e.target.value }))} /></label>
                <label>Instagram URL<input value={String(settingsDraft.instagramUrl ?? BRAND.instagram)} onChange={(e) => setSettingsDraft((d) => ({ ...d, instagramUrl: e.target.value }))} /></label>
              </div>
              <div className="admin-actions">
                <button className="primary-button" onClick={() => void saveSettings()}><Save size={14} /> Save Branding</button>
              </div>
            </section>
          )}

          {/* Translations */}
          {tab === "translations" && (
            <section key="translations" className="sp-tab-pane admin-editor">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Languages size={18} style={{ color: "var(--gold)" }} /> Translations
              </h3>
              <div className="admin-table-wrap">
                <table>
                  <thead><tr><th>Key</th><th>English</th><th>Arabic</th></tr></thead>
                  <tbody>
                    {translationDraft.map((row, i) => (
                      <tr key={row.key} className="sp-tr">
                        <td><code style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{row.key}</code></td>
                        <td><input value={row.en} onChange={(e) => setTranslationDraft((d) => d.map((x, j) => j === i ? { ...x, en: e.target.value } : x))} /></td>
                        <td><input dir="rtl" value={row.ar} onChange={(e) => setTranslationDraft((d) => d.map((x, j) => j === i ? { ...x, ar: e.target.value } : x))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-actions">
                <button className="primary-button" onClick={() => void saveTranslations()}><Save size={14} /> Save Translations</button>
              </div>
            </section>
          )}

          {/* Security */}
          {tab === "security" && (
            <section key="security" className="sp-tab-pane admin-editor">
              <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Shield size={18} style={{ color: "var(--gold)" }} /> Security
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                {[
                  { icon: <CheckCheck size={16} />, label: "JWT Authentication", desc: "All admin API endpoints protected by signed JWT tokens." },
                  { icon: <Shield size={16} />,     label: "Bcrypt Password Hashing", desc: "Admin passwords are hashed server-side — never stored in plain text." },
                  { icon: <UserCog size={16} />,    label: "Role Validation", desc: "Role-based access control enforced on every server request." },
                  { icon: <AlertCircle size={16} />, label: "Rotate Credentials", desc: "Change JWT_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD via env vars before going live." },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="sp-security-row glass">
                    <span className="sp-security-icon">{icon}</span>
                    <div>
                      <strong style={{ display: "block", marginBottom: "0.2rem" }}>{label}</strong>
                      <p className="admin-note" style={{ margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </section>
      </section>
    </main>
  );
}

/* ── Metric card sub-component ──────────────────────────────── */
function MetricCard({ icon, label, value, accent, warn }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <article className={`admin-card sp-metric-card ${accent ? "sp-metric-accent" : ""} ${warn ? "sp-metric-warn" : ""}`}>
      <div className="sp-metric-icon">{icon}</div>
      <p className="admin-note" style={{ margin: 0 }}>{label}</p>
      <strong className="sp-metric-value">{value}</strong>
    </article>
  );
}

function csv(value: string) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function adminEmailGuess() {
  return "admin@shakraperfume.com";
}
