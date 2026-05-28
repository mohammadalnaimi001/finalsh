import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BRAND, products as fallbackProducts } from "./data";
import type { CartItem, Currency, Language, Product } from "./types";

type User = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  tier: "Private Client" | "Collector";
};

type Store = {
  cart: CartItem[];
  products: Product[];
  wishlist: string[];
  user: User | null;
  currency: Currency;
  language: Language;
  logoUrl: string;
  logoMarkUrl: string;
  toast: { productId: string; quantity: number } | null;
  addToCart: (productId: string, quantity?: number) => void;
  dismissToast: () => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleWishlist: (productId: string) => void;
  login: (email: string, password: string, name?: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  submitCheckout: (payload: {
    customer: { name: string; email: string; phone: string; address: string };
    paymentMethod: "card" | "cod";
  }) => Promise<{ id: string }>;
  setCurrency: (currency: Currency) => void;
  setLogoUrl: (url: string) => void;
  setLogoAssets: (url: string, markUrl?: string) => void;
  toggleLanguage: () => void;
  totals: {
    subtotalJod: number;
    deliveryJod: number;
    totalJod: number;
  };
  formatPrice: (jod: number) => string;
  getRecommendations: (product?: Product) => Product[];
};

const StoreContext = createContext<Store | undefined>(undefined);

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable on Safari private mode or locked-down mobile browsers.
  }
}

function updateDocumentMeta(language: Language, iconUrl: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (link) link.href = iconUrl;
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => readStored("shakra-cart", []));
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [wishlist, setWishlist] = useState<string[]>(() => readStored("shakra-wishlist", ["sp-001"]));
  const [user, setUser] = useState<User | null>(() => readStored("shakra-user", {
    name: "Shakra Private Client",
    email: "client@shakraperfume.com",
    tier: "Private Client"
  }));
  const [currency, setCurrency] = useState<Currency>(() => readStored("shakra-currency", "JOD"));
  const [language, setLanguage] = useState<Language>(() => readStored("shakra-language", "en"));
  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    const stored = readStored<string>("shakra-logo-url", "/brand/shakra-logo-full.png");
    return stored === "/brand/logo.svg" ? "/brand/shakra-logo-full.png" : stored;
  });
  const [logoMarkUrl, setLogoMarkUrl] = useState<string>(() => {
    const stored = readStored<string>("shakra-logo-mark-url", "/brand/shakra-logo-icon.png");
    return stored === "/brand/logo.svg" ? "/brand/shakra-logo-icon.png" : stored;
  });
  const [toast, setToast] = useState<{ productId: string; quantity: number } | null>(null);
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    let active = true;
    const endpoint = apiBase ? `${apiBase}/api/products` : "/api/products";
    fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed products fetch");
        const payload = await readJsonSafe<{ products: Record<string, unknown>[] }>(response);
        if (!payload) throw new Error("Invalid products JSON response");
        return payload;
      })
      .then((payload) => {
        if (!active || !Array.isArray(payload.products) || !payload.products.length) return;
        const mapped: Product[] = payload.products.map((row, index) => {
          const notesRow = (typeof row.notes === "string" ? JSON.parse(row.notes) : row.notes) as Product["notes"] | undefined;
          return {
            id: String(row.id ?? `api-${index}`),
            slug: String(row.slug ?? `product-${index}`),
            name: String(row.name_en ?? row.name ?? "Shakra Perfume"),
            arabicName: String(row.name_ar ?? row.name_en ?? row.name ?? "شکرا للعطور"),
            collection: String(row.collection_en ?? "Shakra Collection"),
            category: String(row.category_en ?? "Luxury"),
            gender: (row.gender as Product["gender"]) ?? "Unisex",
            concentration: String(row.concentration ?? "Eau de Parfum"),
            priceJod: Number(row.price_jod ?? 0),
            inventory: Number(row.stock_quantity ?? 0),
            rating: Number(row.rating ?? 4.8),
            reviewCount: Number(row.review_count ?? 0),
            image: String(row.image_gradient ?? "linear-gradient(145deg,#090806,#3a2812 48%,#d1a950)"),
            aura: String(row.aura_en ?? "Signature luxury fragrance."),
            description: String(row.description_en ?? "Shakra Perfume signature composition."),
            notes: notesRow ?? { top: [], heart: [], base: [] },
            tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
            mood: Array.isArray(row.mood) ? (row.mood as string[]) : []
          };
        });
        setProducts(mapped);
      })
      .catch(() => {
        // keep existing curated fallback data
      });
    return () => {
      active = false;
    };
  }, [apiBase]);

  useEffect(() => {
    writeStored("shakra-cart", cart);
  }, [cart]);

  useEffect(() => {
    writeStored("shakra-wishlist", wishlist);
  }, [wishlist]);

  useEffect(() => {
    writeStored("shakra-user", user);
  }, [user]);

  useEffect(() => {
    writeStored("shakra-currency", currency);
  }, [currency]);

  useEffect(() => {
    writeStored("shakra-language", language);
    updateDocumentMeta(language, logoMarkUrl);
  }, [language, logoMarkUrl]);

  useEffect(() => {
    writeStored("shakra-logo-url", logoUrl);
    updateDocumentMeta(language, logoMarkUrl);
  }, [language, logoUrl, logoMarkUrl]);

  useEffect(() => {
    writeStored("shakra-logo-mark-url", logoMarkUrl);
  }, [logoMarkUrl]);

  const subtotalJod = cart.reduce((sum, item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return sum + (product?.priceJod ?? 0) * item.quantity;
  }, 0);

  const totals = useMemo(() => ({
    subtotalJod,
    deliveryJod: cart.length ? BRAND.deliveryFeeJod : 0,
    totalJod: subtotalJod + (cart.length ? BRAND.deliveryFeeJod : 0)
  }), [cart.length, subtotalJod]);

  const value = useMemo<Store>(
    () => ({
      cart,
      products,
      wishlist,
      user,
      currency,
      language,
      logoUrl,
      logoMarkUrl,
      toast,
      totals,
      addToCart: (productId, quantity = 1) => {
        setCart((items) => {
          const existing = items.find((item) => item.productId === productId);
          if (existing) {
            return items.map((item) =>
              item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item
            );
          }
          return [...items, { productId, quantity }];
        });
        setToast({ productId, quantity });
      },
      dismissToast: () => setToast(null),
      removeFromCart: (productId) => setCart((items) => items.filter((item) => item.productId !== productId)),
      updateQuantity: (productId, quantity) =>
        setCart((items) =>
          quantity <= 0
            ? items.filter((item) => item.productId !== productId)
            : items.map((item) => (item.productId === productId ? { ...item, quantity } : item))
        ),
      toggleWishlist: (productId) =>
        setWishlist((items) => (items.includes(productId) ? items.filter((id) => id !== productId) : [...items, productId])),
      login: async (email, password, _name = "Shakra Client") => {
        const endpoint = apiBase ? `${apiBase}/api/auth/login` : "/api/auth/login";
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          if (!response.ok) throw new Error("login failed");
          const payload = await readJsonSafe<{ customer: { id: string; name: string; email: string; phone?: string } }>(response);
          if (!payload) throw new Error("Invalid login JSON response");
          setUser({
            id: payload.customer.id,
            email: payload.customer.email,
            name: payload.customer.name,
            phone: payload.customer.phone,
            tier: "Collector"
          });
        } catch {
          setUser({ email, name: "Shakra Client", tier: "Collector" });
        }
      },
      register: async (name, email, password, phone = "") => {
        const endpoint = apiBase ? `${apiBase}/api/auth/register` : "/api/auth/register";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, phone })
        });
        if (!response.ok) throw new Error("Registration failed");
        const payload = await readJsonSafe<{ customer: { id: string; name: string; email: string; phone?: string } }>(response);
        if (!payload) throw new Error("Invalid registration JSON response");
        setUser({
          id: payload.customer.id,
          email: payload.customer.email,
          name: payload.customer.name,
          phone: payload.customer.phone,
          tier: "Collector"
        });
      },
      logout: () => setUser(null),
      submitCheckout: async ({ customer, paymentMethod }) => {
        const endpoint = apiBase ? `${apiBase}/api/checkout` : "/api/checkout";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer,
            paymentMethod,
            items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
          })
        });
        if (!response.ok) throw new Error("Checkout failed");
        const payload = await readJsonSafe<{ order: { id: string } }>(response);
        if (!payload) throw new Error("Invalid checkout JSON response");
        setCart([]);
        return payload.order;
      },
      setCurrency,
      setLogoUrl: (url) => {
        setLogoUrlState(url);
        setLogoMarkUrl(url);
      },
      setLogoAssets: (url, markUrl = url) => {
        setLogoUrlState(url);
        setLogoMarkUrl(markUrl);
      },
      toggleLanguage: () => setLanguage((current) => (current === "en" ? "ar" : "en")),
      formatPrice: (jod) => {
        if (currency === "USD") {
          return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(jod * BRAND.usdRate);
        }
        return `${jod.toFixed(0)} JOD`;
      },
      getRecommendations: (product) => {
            const basis = product ?? products.find((entry) => wishlist.includes(entry.id)) ?? products[0];
            return products
          .filter((entry) => entry.id !== basis.id)
          .map((entry) => ({
            entry,
            score:
              Number(entry.collection === basis.collection) * 3 +
              entry.mood.filter((mood) => basis.mood.includes(mood)).length * 2 +
              entry.tags.filter((tag) => basis.tags.includes(tag)).length
          }))
          .sort((a, b) => b.score - a.score || b.entry.rating - a.entry.rating)
          .slice(0, 3)
          .map(({ entry }) => entry);
      }
    }),
    [apiBase, cart, currency, language, logoMarkUrl, logoUrl, products, toast, totals, user, wishlist]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }
  return context;
}
