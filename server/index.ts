import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { z } from "zod";
import { BRAND, products as fallbackProducts } from "../src/data";
import { dbQuery, hasDatabase } from "./db";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8787);
const jwtSecret = process.env.JWT_SECRET ?? "development-only-secret";
const customerJwtSecret = process.env.CUSTOMER_JWT_SECRET ?? jwtSecret;
const adminSeedEmail = process.env.ADMIN_EMAIL ?? "admin@shakra.com";
const adminSeedPassword = process.env.ADMIN_PASSWORD ?? "Admin12345";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "..", "public", "uploads");

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowlist = [process.env.VITE_APP_DOMAIN, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178"]
        .filter(Boolean) as string[];
      const localhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      const railway = /^https?:\/\/.*\.railway\.app$/i.test(origin);
      const up = /^https?:\/\/.*\.up\.railway\.app$/i.test(origin);
      if (localhost || railway || up || allowlist.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    }
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.mimetype);
    if (!ok) return cb(new Error("Only image uploads are allowed."));
    return cb(null, true);
  }
});

type AdminUser = { id: string; email: string; role: string };
type CustomerUser = { id: string; email: string };
type StatusRevenueRow = { status: string; total_jod: number | string };
type KeyValueRow = { key: string; value: unknown };
type SectionContentRow = { section: string; content: unknown };
type ProductSearchRow = {
  name_en: string;
  name_ar: string;
  category_en: string;
  category_ar: string;
  slug: string;
};
type OrderSearchRow = {
  id: string;
  status: string;
  payment_method: string;
  customer_name?: string;
  customer_email?: string;
};
type CustomerSearchRow = {
  name: string;
  email: string;
  phone?: string;
};

type FallbackProduct = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  collection_en: string;
  collection_ar: string;
  category_en: string;
  category_ar: string;
  concentration: string;
  gender: "Feminine" | "Masculine" | "Unisex";
  price_jod: number;
  discount_price_jod: number | null;
  stock_quantity: number;
  featured: boolean;
  published: boolean;
  aura_en: string;
  aura_ar: string;
  description_en: string;
  description_ar: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  tags: string[];
  mood: string[];
  rating: number;
  review_count: number;
  image_gradient: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
};

const fallbackState: {
  products: FallbackProduct[];
  orders: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  translations: Array<{ key: string; en: string; ar: string }>;
} = {
  products: fallbackProducts.map((item, index) => {
    const now = new Date().toISOString();
    return {
      id: item.id,
      slug: item.slug,
      name_en: item.name,
      name_ar: item.arabicName,
      collection_en: item.collection,
      collection_ar: item.collection,
      category_en: item.category,
      category_ar: item.category,
      concentration: item.concentration,
      gender: item.gender,
      price_jod: item.priceJod,
      discount_price_jod: null,
      stock_quantity: item.inventory,
      featured: index < 4,
      published: true,
      aura_en: item.aura,
      aura_ar: item.aura,
      description_en: item.description,
      description_ar: item.description,
      notes: item.notes,
      tags: item.tags,
      mood: item.mood,
      rating: item.rating,
      review_count: item.reviewCount,
      image_gradient: item.image,
      image_urls: [],
      created_at: now,
      updated_at: now
    };
  }),
  orders: [],
  customers: [],
  content: {},
  settings: {
    logoFullUrl: "/brand/shakra-logo-full.png",
    logoMarkUrl: "/brand/shakra-logo-icon.png"
  },
  translations: []
};

async function ensureDatabaseReady() {
  if (!hasDatabase) return;
  const seed = await dbQuery<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM admin_accounts WHERE email = $1) AS exists",
    [adminSeedEmail]
  );
  if (seed.rows[0]?.exists) return;
  const hash = await bcrypt.hash(adminSeedPassword, 12);
  await dbQuery(
    "INSERT INTO admin_accounts (email, password_hash, role) VALUES ($1, $2, 'super_admin')",
    [adminSeedEmail, hash]
  );
  console.log(`Seeded admin account: ${adminSeedEmail}`);
}

function adminToken(user: AdminUser) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, kind: "admin" }, jwtSecret, { expiresIn: "12h" });
}
function customerToken(user: CustomerUser) {
  return jwt.sign({ sub: user.id, email: user.email, kind: "customer" }, customerJwtSecret, { expiresIn: "30d" });
}

function authAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing admin token." });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as jwt.JwtPayload;
    if (payload.kind !== "admin") return res.status(403).json({ error: "Invalid role." });
    (req as express.Request & { admin: jwt.JwtPayload }).admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function authCustomer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing customer token." });
  try {
    const payload = jwt.verify(header.slice(7), customerJwtSecret) as jwt.JwtPayload;
    if (payload.kind !== "customer") return res.status(403).json({ error: "Invalid role." });
    (req as express.Request & { customer: jwt.JwtPayload }).customer = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

const productSchema = z.object({
  slug: z.string().min(2),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  collectionEn: z.string().min(2),
  collectionAr: z.string().min(2),
  categoryEn: z.string().min(2),
  categoryAr: z.string().min(2),
  concentration: z.string().min(2),
  gender: z.enum(["Feminine", "Masculine", "Unisex"]),
  priceJod: z.number().nonnegative(),
  discountPriceJod: z.number().nonnegative().nullable(),
  stockQuantity: z.number().int().nonnegative(),
  featured: z.boolean(),
  published: z.boolean(),
  auraEn: z.string().min(2),
  auraAr: z.string().min(2),
  descriptionEn: z.string().min(2),
  descriptionAr: z.string().min(2),
  notes: z.object({
    top: z.array(z.string().min(1)),
    heart: z.array(z.string().min(1)),
    base: z.array(z.string().min(1))
  }),
  tags: z.array(z.string()).default([]),
  mood: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).default(4.8),
  reviewCount: z.number().int().nonnegative().default(0),
  imageGradient: z.string().min(2),
  imageUrls: z.array(z.string()).default([])
});

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().min(3),
    email: z.string().email(),
    phone: z.string().regex(/^(\+?962|0)?7[789][0-9]{7}$/),
    address: z.string().min(10)
  }),
  paymentMethod: z.enum(["card", "cod"]),
  items: z.array(z.object({ productId: z.string().min(2), quantity: z.number().int().positive() })).min(1)
});
const categorySchema = z.object({
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  image: z.string().optional().default(""),
  slug: z.string().min(2)
});
const customerAuthSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional().default("")
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, brand: BRAND.name, db: hasDatabase ? "postgresql" : "missing-database-url" });
});

app.post("/api/admin/auth/login", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials payload." });
  if (!hasDatabase) {
    if (parsed.data.email !== adminSeedEmail || parsed.data.password !== adminSeedPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    return res.json({ token: adminToken({ id: "fallback-admin", email: adminSeedEmail, role: "super_admin" }) });
  }
  const account = await dbQuery<{
    id: string;
    email: string;
    password_hash: string;
    role: string;
    is_active: boolean;
  }>("SELECT id, email, password_hash, role, is_active FROM admin_accounts WHERE email = $1", [parsed.data.email]);
  const user = account.rows[0];
  if (!user || !user.is_active) return res.status(401).json({ error: "Invalid email or password." });
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  return res.json({ token: adminToken({ id: user.id, email: user.email, role: user.role }) });
});

app.get("/api/admin/bootstrap", authAdmin, async (_req, res) => {
  if (!hasDatabase) {
    return res.json({
      metrics: {
        products: fallbackState.products.length,
        orders: fallbackState.orders.length,
        customers: fallbackState.customers.length,
        pendingOrders: 0,
        processingOrders: 0,
        deliveredOrders: 0,
        totalRevenueJod: 0
      },
      products: fallbackState.products,
      orders: fallbackState.orders,
      customers: fallbackState.customers,
      settings: fallbackState.settings,
      content: fallbackState.content,
      translations: fallbackState.translations
    });
  }
  if (!hasDatabase) return res.status(500).json({ error: "DATABASE_URL is not configured." });
  const [products, orders, customers, settings, content, translations] = await Promise.all([
    dbQuery("SELECT * FROM products ORDER BY created_at DESC"),
    dbQuery<StatusRevenueRow>("SELECT o.status, o.total_jod, c.name AS customer_name, c.email AS customer_email FROM orders o LEFT JOIN customers c ON c.id = o.customer_id ORDER BY o.created_at DESC LIMIT 300"),
    dbQuery("SELECT c.*, COALESCE(COUNT(o.id), 0) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 300"),
    dbQuery<KeyValueRow>("SELECT key, value FROM site_settings"),
    dbQuery<SectionContentRow>("SELECT section, content FROM site_content"),
    dbQuery<{ key: string; en: string; ar: string }>("SELECT key, en, ar FROM translations ORDER BY key")
  ]);
  const metrics = {
    products: Number(products.rowCount ?? 0),
    orders: Number(orders.rowCount ?? 0),
    customers: Number(customers.rowCount ?? 0),
    pendingOrders: orders.rows.filter((row) => row.status === "pending").length,
    processingOrders: orders.rows.filter((row) => row.status === "processing").length,
    deliveredOrders: orders.rows.filter((row) => row.status === "delivered").length,
    totalRevenueJod: orders.rows
      .filter((row) => row.status !== "cancelled")
      .reduce((sum: number, row) => sum + Number(row.total_jod ?? 0), 0)
  };
  res.json({
    metrics,
    products: products.rows,
    orders: orders.rows,
    customers: customers.rows,
    settings: Object.fromEntries(settings.rows.map((row) => [row.key, row.value])),
    content: Object.fromEntries(content.rows.map((row) => [row.section, row.content])),
    translations: translations.rows
  });
});

app.get("/api/admin/analytics", authAdmin, async (_req, res) => {
  if (!hasDatabase) {
    return res.json({
      revenueByStatus: [],
      topProducts: [],
      monthlyOrders: []
    });
  }
  const [revenueByStatus, topProducts, monthlyOrders] = await Promise.all([
    dbQuery("SELECT status, SUM(total_jod) AS total FROM orders GROUP BY status"),
    dbQuery(
      `SELECT p.id, p.name_en, SUM(oi.quantity) AS sold
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       GROUP BY p.id, p.name_en
       ORDER BY sold DESC
       LIMIT 10`
    ),
    dbQuery(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS orders, SUM(total_jod) AS revenue
       FROM orders
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`
    )
  ]);
  res.json({
    revenueByStatus: revenueByStatus.rows,
    topProducts: topProducts.rows,
    monthlyOrders: monthlyOrders.rows
  });
});

app.get("/api/admin/products", authAdmin, async (req, res) => {
  if (!hasDatabase) {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    const category = String(req.query.category ?? "").trim().toLowerCase();
    const rows = fallbackState.products.filter((row) => {
      const hay = [row.name_en, row.name_ar, row.category_en, row.category_ar, row.slug].join(" ").toLowerCase();
      const categoryOk = !category || row.category_en.toLowerCase() === category || row.category_ar.toLowerCase() === category;
      return categoryOk && (!q || hay.includes(q));
    });
    return res.json({ products: rows });
  }
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const category = String(req.query.category ?? "").trim().toLowerCase();
  const result = await dbQuery<ProductSearchRow>("SELECT name_en, name_ar, category_en, category_ar, slug FROM products ORDER BY created_at DESC");
  const filtered = result.rows.filter((row) => {
    const hay = [row.name_en, row.name_ar, row.category_en, row.category_ar, row.slug].join(" ").toLowerCase();
    const categoryOk = !category || row.category_en.toLowerCase() === category || row.category_ar.toLowerCase() === category;
    return categoryOk && (!q || hay.includes(q));
  });
  res.json({ products: filtered });
});

app.post("/api/admin/products", authAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product payload.", issues: parsed.error.issues });
  const p = parsed.data;
  if (!hasDatabase) {
    const now = new Date().toISOString();
    const created: FallbackProduct = {
      id: nanoid(10),
      slug: p.slug,
      name_en: p.nameEn,
      name_ar: p.nameAr,
      collection_en: p.collectionEn,
      collection_ar: p.collectionAr,
      category_en: p.categoryEn,
      category_ar: p.categoryAr,
      concentration: p.concentration,
      gender: p.gender,
      price_jod: p.priceJod,
      discount_price_jod: p.discountPriceJod,
      stock_quantity: p.stockQuantity,
      featured: p.featured,
      published: p.published,
      aura_en: p.auraEn,
      aura_ar: p.auraAr,
      description_en: p.descriptionEn,
      description_ar: p.descriptionAr,
      notes: p.notes,
      tags: p.tags,
      mood: p.mood,
      rating: p.rating,
      review_count: p.reviewCount,
      image_gradient: p.imageGradient,
      image_urls: p.imageUrls,
      created_at: now,
      updated_at: now
    };
    fallbackState.products.unshift(created);
    return res.status(201).json({ product: created });
  }
  const created = await dbQuery(
    `INSERT INTO products
      (slug, name_en, name_ar, collection_en, collection_ar, category_en, category_ar, concentration, gender,
       price_jod, discount_price_jod, stock_quantity, featured, published, aura_en, aura_ar, description_en, description_ar,
       notes, tags, mood, rating, review_count, image_gradient, image_urls)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
     RETURNING *`,
    [
      p.slug, p.nameEn, p.nameAr, p.collectionEn, p.collectionAr, p.categoryEn, p.categoryAr, p.concentration, p.gender,
      p.priceJod, p.discountPriceJod, p.stockQuantity, p.featured, p.published, p.auraEn, p.auraAr, p.descriptionEn, p.descriptionAr,
      JSON.stringify(p.notes), p.tags, p.mood, p.rating, p.reviewCount, p.imageGradient, JSON.stringify(p.imageUrls)
    ]
  );
  res.status(201).json({ product: created.rows[0] });
});

app.put("/api/admin/products/:id", authAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product payload.", issues: parsed.error.issues });
  const p = parsed.data;
  if (!hasDatabase) {
    const idx = fallbackState.products.findIndex((row) => row.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Product not found." });
    const existing = fallbackState.products[idx];
    const updated = {
      ...existing,
      slug: p.slug,
      name_en: p.nameEn,
      name_ar: p.nameAr,
      collection_en: p.collectionEn,
      collection_ar: p.collectionAr,
      category_en: p.categoryEn,
      category_ar: p.categoryAr,
      concentration: p.concentration,
      gender: p.gender,
      price_jod: p.priceJod,
      discount_price_jod: p.discountPriceJod,
      stock_quantity: p.stockQuantity,
      featured: p.featured,
      published: p.published,
      aura_en: p.auraEn,
      aura_ar: p.auraAr,
      description_en: p.descriptionEn,
      description_ar: p.descriptionAr,
      notes: p.notes,
      tags: p.tags,
      mood: p.mood,
      rating: p.rating,
      review_count: p.reviewCount,
      image_gradient: p.imageGradient,
      image_urls: p.imageUrls,
      updated_at: new Date().toISOString()
    };
    fallbackState.products[idx] = updated;
    return res.json({ product: updated });
  }
  const updated = await dbQuery(
    `UPDATE products SET
      slug=$2,name_en=$3,name_ar=$4,collection_en=$5,collection_ar=$6,category_en=$7,category_ar=$8,concentration=$9,gender=$10,
      price_jod=$11,discount_price_jod=$12,stock_quantity=$13,featured=$14,published=$15,aura_en=$16,aura_ar=$17,description_en=$18,description_ar=$19,
      notes=$20,tags=$21,mood=$22,rating=$23,review_count=$24,image_gradient=$25,image_urls=$26,updated_at=now()
      WHERE id=$1 RETURNING *`,
    [
      req.params.id, p.slug, p.nameEn, p.nameAr, p.collectionEn, p.collectionAr, p.categoryEn, p.categoryAr, p.concentration, p.gender,
      p.priceJod, p.discountPriceJod, p.stockQuantity, p.featured, p.published, p.auraEn, p.auraAr, p.descriptionEn, p.descriptionAr,
      JSON.stringify(p.notes), p.tags, p.mood, p.rating, p.reviewCount, p.imageGradient, JSON.stringify(p.imageUrls)
    ]
  );
  if (!updated.rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json({ product: updated.rows[0] });
});

app.delete("/api/admin/products/:id", authAdmin, async (req, res) => {
  if (!hasDatabase) {
    const before = fallbackState.products.length;
    fallbackState.products = fallbackState.products.filter((row) => row.id !== req.params.id);
    if (fallbackState.products.length === before) return res.status(404).json({ error: "Product not found." });
    return res.json({ deleted: true });
  }
  const removed = await dbQuery("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
  if (!removed.rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json({ deleted: true });
});

app.get("/api/admin/categories", authAdmin, async (_req, res) => {
  if (!hasDatabase) return res.json({ categories: [] });
  const categories = await dbQuery("SELECT * FROM categories ORDER BY name_en ASC");
  res.json({ categories: categories.rows });
});

app.post("/api/admin/categories", authAdmin, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category payload.", issues: parsed.error.issues });
  if (!hasDatabase) return res.status(201).json({ category: { id: nanoid(10), ...parsed.data } });
  const category = await dbQuery(
    `INSERT INTO categories (name_en, name_ar, image, slug)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [parsed.data.nameEn, parsed.data.nameAr, parsed.data.image, parsed.data.slug]
  );
  res.status(201).json({ category: category.rows[0] });
});

app.put("/api/admin/categories/:id", authAdmin, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid category payload.", issues: parsed.error.issues });
  if (!hasDatabase) return res.json({ category: { id: req.params.id, ...parsed.data } });
  const updated = await dbQuery(
    `UPDATE categories
     SET name_en = $2, name_ar = $3, image = $4, slug = $5, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [req.params.id, parsed.data.nameEn, parsed.data.nameAr, parsed.data.image, parsed.data.slug]
  );
  if (!updated.rows[0]) return res.status(404).json({ error: "Category not found." });
  res.json({ category: updated.rows[0] });
});

app.delete("/api/admin/categories/:id", authAdmin, async (req, res) => {
  if (!hasDatabase) return res.json({ deleted: true });
  const removed = await dbQuery("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
  if (!removed.rows[0]) return res.status(404).json({ error: "Category not found." });
  res.json({ deleted: true });
});

app.post("/api/admin/upload", authAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File is required." });
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});

app.get("/api/admin/orders", authAdmin, async (req, res) => {
  if (!hasDatabase) return res.json({ orders: fallbackState.orders });
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim().toLowerCase();
  const result = await dbQuery<OrderSearchRow>(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC
     LIMIT 500`
  );
  const rows = result.rows.filter((row) => {
    const hay = [row.id, row.customer_name, row.customer_email, row.payment_method].join(" ").toLowerCase();
    return (!q || hay.includes(q)) && (!status || row.status === status);
  });
  res.json({ orders: rows });
});

app.patch("/api/admin/orders/:id/status", authAdmin, async (req, res) => {
  const parsed = z.object({ status: z.enum(["pending", "processing", "delivered", "cancelled"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status payload." });
  if (!hasDatabase) return res.json({ order: { id: req.params.id, status: parsed.data.status } });
  const updated = await dbQuery("UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *", [req.params.id, parsed.data.status]);
  if (!updated.rows[0]) return res.status(404).json({ error: "Order not found." });
  res.json({ order: updated.rows[0] });
});

app.get("/api/admin/customers", authAdmin, async (req, res) => {
  if (!hasDatabase) return res.json({ customers: fallbackState.customers });
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const result = await dbQuery<CustomerSearchRow>(
    `SELECT c.*, COALESCE(COUNT(o.id), 0) AS order_count
     FROM customers c
     LEFT JOIN orders o ON o.customer_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC
     LIMIT 500`
  );
  const rows = result.rows.filter((row) => {
    const hay = [row.name, row.email, row.phone].join(" ").toLowerCase();
    return !q || hay.includes(q);
  });
  res.json({ customers: rows });
});

app.patch("/api/admin/customers/:id/ban", authAdmin, async (req, res) => {
  const parsed = z.object({ isBanned: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid ban payload." });
  if (!hasDatabase) return res.json({ customer: { id: req.params.id, is_banned: parsed.data.isBanned } });
  const updated = await dbQuery("UPDATE customers SET is_banned = $2, updated_at = now() WHERE id = $1 RETURNING *", [req.params.id, parsed.data.isBanned]);
  if (!updated.rows[0]) return res.status(404).json({ error: "Customer not found." });
  res.json({ customer: updated.rows[0] });
});

app.delete("/api/admin/customers/:id", authAdmin, async (req, res) => {
  if (!hasDatabase) return res.json({ deleted: true });
  const removed = await dbQuery("DELETE FROM customers WHERE id = $1 RETURNING id", [req.params.id]);
  if (!removed.rows[0]) return res.status(404).json({ error: "Customer not found." });
  res.json({ deleted: true });
});

app.get("/api/admin/content", authAdmin, async (_req, res) => {
  if (!hasDatabase) return res.json({ content: fallbackState.content });
  const rows = await dbQuery<SectionContentRow>("SELECT section, content FROM site_content");
  res.json({ content: Object.fromEntries(rows.rows.map((row) => [row.section, row.content])) });
});

app.put("/api/admin/content", authAdmin, async (req, res) => {
  const parsed = z.record(z.any()).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid content payload." });
  if (!hasDatabase) {
    fallbackState.content = { ...fallbackState.content, ...parsed.data };
    return res.json({ updated: true });
  }
  const entries = Object.entries(parsed.data);
  for (const [section, content] of entries) {
    await dbQuery(
      `INSERT INTO site_content (section, content, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (section) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`,
      [section, JSON.stringify(content)]
    );
  }
  res.json({ updated: true });
});

app.get("/api/admin/settings", authAdmin, async (_req, res) => {
  if (!hasDatabase) return res.json({ settings: fallbackState.settings });
  const rows = await dbQuery<KeyValueRow>("SELECT key, value FROM site_settings");
  res.json({ settings: Object.fromEntries(rows.rows.map((row) => [row.key, row.value])) });
});

app.put("/api/admin/settings", authAdmin, async (req, res) => {
  const parsed = z.record(z.any()).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid settings payload." });
  if (!hasDatabase) {
    fallbackState.settings = { ...fallbackState.settings, ...parsed.data };
    return res.json({ updated: true });
  }
  const entries = Object.entries(parsed.data);
  for (const [key, value] of entries) {
    await dbQuery(
      `INSERT INTO site_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(value)]
    );
  }
  res.json({ updated: true });
});

app.get("/api/admin/translations", authAdmin, async (_req, res) => {
  if (!hasDatabase) return res.json({ translations: fallbackState.translations });
  const rows = await dbQuery("SELECT key, en, ar FROM translations ORDER BY key");
  res.json({ translations: rows.rows });
});

app.put("/api/admin/translations", authAdmin, async (req, res) => {
  const parsed = z.array(z.object({ key: z.string().min(1), en: z.string(), ar: z.string() })).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid translations payload." });
  if (!hasDatabase) {
    fallbackState.translations = parsed.data;
    return res.json({ updated: true });
  }
  for (const row of parsed.data) {
    await dbQuery(
      `INSERT INTO translations (key, en, ar, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET en = EXCLUDED.en, ar = EXCLUDED.ar, updated_at = now()`,
      [row.key, row.en, row.ar]
    );
  }
  res.json({ updated: true });
});

app.get("/api/products", async (_req, res) => {
  if (!hasDatabase) return res.json({ products: fallbackState.products.filter((row) => row.published) });
  const result = await dbQuery("SELECT * FROM products WHERE published = true ORDER BY created_at DESC");
  res.json({ products: result.rows });
});

app.get("/api/categories", async (_req, res) => {
  if (!hasDatabase) {
    const names = [...new Set(fallbackState.products.map((row) => row.category_en))];
    return res.json({
      categories: names.map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name_en: name,
        name_ar: name,
        image: "",
        slug: name.toLowerCase().replace(/\s+/g, "-")
      }))
    });
  }
  const result = await dbQuery("SELECT * FROM categories ORDER BY name_en ASC");
  res.json({ categories: result.rows });
});

app.get("/api/products/:slug", async (req, res) => {
  if (!hasDatabase) {
    const product = fallbackState.products.find((row) => row.slug === req.params.slug);
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json({ product, reviews: [] });
  }
  const product = await dbQuery<{ id: string } & Record<string, unknown>>("SELECT * FROM products WHERE slug = $1 LIMIT 1", [req.params.slug]);
  if (!product.rows[0]) return res.status(404).json({ error: "Product not found" });
  const rv = await dbQuery(
    `SELECT r.id, r.rating, r.body, r.created_at, COALESCE(c.name, 'Shakra Client') AS name
     FROM reviews r LEFT JOIN customers c ON c.id = r.customer_id
     WHERE r.product_id = $1 AND r.status = 'approved'
     ORDER BY r.created_at DESC`,
    [product.rows[0].id]
  );
  res.json({ product: product.rows[0], reviews: rv.rows });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = customerAuthSchema.extend({ name: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration payload.", issues: parsed.error.issues });
  if (!hasDatabase) {
    const customer = {
      id: `cust-${nanoid(8)}`,
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone ?? ""
    };
    return res.status(201).json({ token: customerToken({ id: customer.id, email: customer.email }), customer });
  }
  const exists = await dbQuery<{ id: string }>("SELECT id FROM customers WHERE email = $1 LIMIT 1", [parsed.data.email]);
  if (exists.rows[0]) return res.status(409).json({ error: "Email already exists." });
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const customer = await dbQuery<{ id: string; email: string; name: string; phone: string }>(
    `INSERT INTO customers (email, name, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, phone`,
    [parsed.data.email, parsed.data.name, parsed.data.phone, hash]
  );
  const created = customer.rows[0];
  res.status(201).json({ token: customerToken({ id: created.id, email: created.email }), customer: created });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = customerAuthSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login payload.", issues: parsed.error.issues });
  if (!hasDatabase) {
    const customer = {
      id: "fallback-customer",
      email: parsed.data.email,
      name: "Shakra Client",
      phone: parsed.data.phone ?? ""
    };
    return res.json({ token: customerToken({ id: customer.id, email: customer.email }), customer });
  }
  const customer = await dbQuery<{ id: string; email: string; name: string; phone: string; password_hash: string | null; is_banned: boolean }>(
    "SELECT id, email, name, phone, password_hash, is_banned FROM customers WHERE email = $1 LIMIT 1",
    [parsed.data.email]
  );
  const user = customer.rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ error: "Invalid email or password." });
  if (user.is_banned) return res.status(403).json({ error: "Account is restricted." });
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password." });
  res.json({ token: customerToken({ id: user.id, email: user.email }), customer: { id: user.id, email: user.email, name: user.name, phone: user.phone } });
});

app.get("/api/customer/me", authCustomer, async (req, res) => {
  if (!hasDatabase) {
    const customerId = String((req as express.Request & { customer: jwt.JwtPayload }).customer.sub);
    return res.json({
      customer: { id: customerId, email: "client@shakraperfume.com", name: "Shakra Client", phone: "" },
      orders: [],
      wishlist: []
    });
  }
  const customerId = (req as express.Request & { customer: jwt.JwtPayload }).customer.sub;
  const [customer, orders, wishlist] = await Promise.all([
    dbQuery("SELECT id, email, name, phone, addresses, created_at FROM customers WHERE id = $1 LIMIT 1", [customerId]),
    dbQuery("SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC", [customerId]),
    dbQuery(
      `SELECT p.* FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.customer_id = $1`,
      [customerId]
    )
  ]);
  if (!customer.rows[0]) return res.status(404).json({ error: "Customer not found." });
  res.json({ customer: customer.rows[0], orders: orders.rows, wishlist: wishlist.rows });
});

app.post("/api/customer/wishlist/:productId", authCustomer, async (req, res) => {
  if (!hasDatabase) return res.status(201).json({ ok: true });
  const customerId = (req as express.Request & { customer: jwt.JwtPayload }).customer.sub;
  await dbQuery(
    `INSERT INTO wishlists (customer_id, product_id)
     VALUES ($1, $2::uuid)
     ON CONFLICT (customer_id, product_id) DO NOTHING`,
    [customerId, req.params.productId]
  );
  res.status(201).json({ ok: true });
});

app.delete("/api/customer/wishlist/:productId", authCustomer, async (req, res) => {
  if (!hasDatabase) return res.json({ ok: true });
  const customerId = (req as express.Request & { customer: jwt.JwtPayload }).customer.sub;
  await dbQuery("DELETE FROM wishlists WHERE customer_id = $1 AND product_id = $2::uuid", [customerId, req.params.productId]);
  res.json({ ok: true });
});

app.post("/api/checkout", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid checkout payload", issues: parsed.error.issues });
  if (!hasDatabase) {
    const orderId = `SP-${nanoid(8).toUpperCase()}`;
    return res.status(201).json({
      order: {
        id: orderId,
        status: parsed.data.paymentMethod === "cod" ? "pending" : "processing",
        subtotalJod: 0,
        deliveryJod: BRAND.deliveryFeeJod,
        totalJod: BRAND.deliveryFeeJod
      }
    });
  }
  const existing = await dbQuery<{ id: string; is_banned: boolean }>("SELECT id, is_banned FROM customers WHERE email = $1 LIMIT 1", [parsed.data.customer.email]);
  let customerId = existing.rows[0]?.id;
  if (existing.rows[0]?.is_banned) return res.status(403).json({ error: "Customer account is restricted." });
  if (!customerId) {
    const created = await dbQuery<{ id: string }>(
      "INSERT INTO customers (email, name, phone) VALUES ($1, $2, $3) RETURNING id",
      [parsed.data.customer.email, parsed.data.customer.name, parsed.data.customer.phone]
    );
    customerId = created.rows[0].id;
  }
  const ids = parsed.data.items.map((item) => item.productId);
  const productRows = await dbQuery<{ id: string; price_jod: string }>(
    "SELECT id, price_jod FROM products WHERE id = ANY($1::uuid[])",
    [ids]
  );
  const priceMap = new Map(productRows.rows.map((row: { id: string; price_jod: string }) => [row.id, Number(row.price_jod)]));
  const subtotalJod = parsed.data.items.reduce((sum: number, item) => sum + Number(priceMap.get(item.productId) ?? 0) * Number(item.quantity), 0);
  const orderId = `SP-${nanoid(8).toUpperCase()}`;
  const status = parsed.data.paymentMethod === "cod" ? "pending" : "processing";
  await dbQuery(
    `INSERT INTO orders (id, customer_id, status, payment_method, payment_status, subtotal_jod, delivery_jod, total_jod, shipping_address)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8::jsonb)`,
    [orderId, customerId, status, parsed.data.paymentMethod, subtotalJod, BRAND.deliveryFeeJod, subtotalJod + BRAND.deliveryFeeJod, JSON.stringify(parsed.data.customer)]
  );
  for (const item of parsed.data.items) {
    const unit = priceMap.get(item.productId) ?? 0;
    await dbQuery(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price_jod) VALUES ($1, $2, $3, $4)",
      [orderId, item.productId, item.quantity, unit]
    );
    await dbQuery("UPDATE products SET stock_quantity = GREATEST(stock_quantity - $2, 0), updated_at = now() WHERE id = $1", [item.productId, item.quantity]);
  }
  res.status(201).json({
    order: {
      id: orderId,
      status,
      subtotalJod,
      deliveryJod: BRAND.deliveryFeeJod,
      totalJod: subtotalJod + BRAND.deliveryFeeJod
    }
  });
});

app.post("/api/newsletter", async (req, res) => {
  const parsed = z.object({ email: z.string().email(), language: z.enum(["en", "ar"]).default("en") }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email." });
  if (!hasDatabase) return res.status(201).json({ ok: true, message: "Subscribed to Shakra Perfume private notes." });
  await dbQuery(
    `INSERT INTO translations (key, en, ar, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO NOTHING`,
    [`newsletter:${parsed.data.email}`, parsed.data.language, parsed.data.language]
  );
  res.status(201).json({ ok: true, message: "Subscribed to Shakra Perfume private notes." });
});

if (process.env.NODE_ENV === "production") {
  const distDir = path.resolve(process.cwd(), "dist");

  app.use("/assets", express.static(path.join(distDir, "assets")));
  app.use(express.static(distDir));

  app.get("*", (req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/assets") ||
    req.path.includes(".")
  ) {
    console.log("static/api:", req.path);
    return next();
  }

  console.log(" SPA:", req.url);
  res.sendFile(path.join(distDir, "index.html"));
});
} //

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  if (error instanceof Error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: "Unexpected server error." });
});

ensureDatabaseReady()
  .then(() => {
    app.listen(port, () => {
      console.log(`Shakra Perfume API running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Server boot failed:", error);
    process.exit(1);
  });
