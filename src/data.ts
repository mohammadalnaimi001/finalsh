import type { Order, Product, Review } from "./types";

export const BRAND = {
  name: "Shakra Perfume",
  initials: "SP",
  domain: "shakraperfume.com",
  phone: "+(962)785828950",
  whatsapp: "https://wa.me/962785828950",
  instagram:
    "https://www.instagram.com/shakra_perfume?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
  deliveryFeeJod: 3,
  usdRate: 1.41
};

export const products: Product[] = [
  {
    id: "sp-001",
    slug: "noir-saffron-oud",
    name: "Noir Saffron Oud",
    arabicName: "عود الزعفران الأسود",
    collection: "Obsidian Reserve",
    category: "Oud",
    gender: "Unisex",
    concentration: "Extrait de Parfum",
    priceJod: 128,
    inventory: 24,
    rating: 4.9,
    reviewCount: 86,
    image: "linear-gradient(145deg,#090806,#3a2812 48%,#d1a950)",
    aura: "Smoked saffron, polished woods, and velvet amber.",
    description:
      "A ceremonial oud built for midnight entrances, where saffron burns bright over lacquered woods and a slow amber trail.",
    notes: {
      top: ["Kashmiri saffron", "Black pepper", "Bergamot"],
      heart: ["Cambodian oud", "Rose absolute", "Suede"],
      base: ["Amber resin", "Guaiac wood", "Musk"]
    },
    tags: ["Bestseller", "Evening", "Oud"],
    mood: ["mysterious", "warm", "commanding"]
  },
  {
    id: "sp-002",
    slug: "amber-of-amman",
    name: "Amber of Amman",
    arabicName: "عنبر عمّان",
    collection: "Royal Levant",
    category: "Amber",
    gender: "Unisex",
    concentration: "Eau de Parfum Intense",
    priceJod: 96,
    inventory: 41,
    rating: 4.8,
    reviewCount: 72,
    image: "linear-gradient(145deg,#0d0b09,#6e441e 50%,#e7c77a)",
    aura: "Golden amber, dates, incense, and sun-warmed stone.",
    description:
      "A luminous tribute to Amman at dusk, blending resinous amber with incense, soft spices, and a refined gourmand shadow.",
    notes: {
      top: ["Cardamom", "Mandarin", "Date accord"],
      heart: ["Labdanum", "Frankincense", "Jasmine tea"],
      base: ["Ambergris", "Vanilla smoke", "Cedar"]
    },
    tags: ["Signature", "Warm"],
    mood: ["golden", "smooth", "magnetic"]
  },
  {
    id: "sp-003",
    slug: "white-musk-veil",
    name: "White Musk Veil",
    arabicName: "حجاب المسك الأبيض",
    collection: "Silk Rituals",
    category: "Musk",
    gender: "Feminine",
    concentration: "Eau de Parfum",
    priceJod: 82,
    inventory: 55,
    rating: 4.7,
    reviewCount: 64,
    image: "linear-gradient(145deg,#111,#d8d0c1 47%,#ffffff)",
    aura: "Clean musk, iris silk, pear skin, and polished skin warmth.",
    description:
      "Soft, immaculate, and addictive. White Musk Veil wraps skin in powdery iris, luminous musk, and a quietly expensive finish.",
    notes: {
      top: ["Pear skin", "Aldehydes", "Pink pepper"],
      heart: ["Iris butter", "White rose", "Cotton musk"],
      base: ["Cashmere wood", "Ambrette", "Creamy sandalwood"]
    },
    tags: ["Soft", "Day"],
    mood: ["clean", "intimate", "elegant"]
  },
  {
    id: "sp-004",
    slug: "velvet-rose-majesty",
    name: "Velvet Rose Majesty",
    arabicName: "هيبة الورد المخملي",
    collection: "Royal Levant",
    category: "Floral",
    gender: "Feminine",
    concentration: "Extrait de Parfum",
    priceJod: 118,
    inventory: 18,
    rating: 4.9,
    reviewCount: 98,
    image: "linear-gradient(145deg,#0c0507,#5c1025 55%,#d6b56d)",
    aura: "Damask rose, raspberry liqueur, oud silk, and incense.",
    description:
      "A deep red floral composition with a couture finish, where Damask rose meets fruit liqueur and an elegant oud veil.",
    notes: {
      top: ["Raspberry", "Saffron", "Lemon zest"],
      heart: ["Damask rose", "Geranium", "Incense"],
      base: ["Oud silk", "Patchouli", "Amber woods"]
    },
    tags: ["Limited", "Rose"],
    mood: ["romantic", "opulent", "dramatic"]
  },
  {
    id: "sp-005",
    slug: "midnight-incense",
    name: "Midnight Incense",
    arabicName: "بخور منتصف الليل",
    collection: "Obsidian Reserve",
    category: "Incense",
    gender: "Masculine",
    concentration: "Parfum",
    priceJod: 104,
    inventory: 33,
    rating: 4.8,
    reviewCount: 51,
    image: "linear-gradient(145deg,#030303,#181613 48%,#8b774c)",
    aura: "Frankincense smoke, black tea, cedar, and mineral musk.",
    description:
      "Dry, architectural, and intensely modern. Midnight Incense creates a smoky silhouette with black tea and mineral woods.",
    notes: {
      top: ["Black tea", "Juniper", "Elemi"],
      heart: ["Omani frankincense", "Clary sage", "Violet leaf"],
      base: ["Cedar", "Vetiver", "Mineral musk"]
    },
    tags: ["Modern", "Smoky"],
    mood: ["focused", "dark", "tailored"]
  },
  {
    id: "sp-006",
    slug: "golden-fig-elixir",
    name: "Golden Fig Elixir",
    arabicName: "إكسير التين الذهبي",
    collection: "Silk Rituals",
    category: "Fruity",
    gender: "Unisex",
    concentration: "Eau de Parfum",
    priceJod: 88,
    inventory: 47,
    rating: 4.6,
    reviewCount: 44,
    image: "linear-gradient(145deg,#0b0906,#41522a 45%,#d7b15d)",
    aura: "Green fig, honeyed woods, neroli, and salted skin.",
    description:
      "A sunlit luxury fragrance with green fig leaf, citrus flower, and a salted amber drydown that feels fresh but expensive.",
    notes: {
      top: ["Fig leaf", "Neroli", "Italian lemon"],
      heart: ["Honey accord", "Tea rose", "Olive wood"],
      base: ["Salted amber", "Sandalwood", "Skin musk"]
    },
    tags: ["Fresh", "Resort"],
    mood: ["bright", "sensual", "green"]
  }
];

export const reviews: Review[] = [
  {
    id: "r1",
    productId: "sp-001",
    name: "Lina Haddad",
    location: "Amman",
    rating: 5,
    body: "Noir Saffron Oud smells like a private evening salon. Deep, elegant, and unforgettable.",
    date: "2026-04-18"
  },
  {
    id: "r2",
    productId: "sp-004",
    name: "Maya K.",
    location: "Dubai",
    rating: 5,
    body: "The rose is rich but not old-fashioned. The bottle, the scent, the trail all feel premium.",
    date: "2026-03-29"
  },
  {
    id: "r3",
    productId: "sp-002",
    name: "Omar S.",
    location: "Riyadh",
    rating: 5,
    body: "Amber of Amman has become my signature. Warm, smooth, and very refined.",
    date: "2026-02-21"
  }
];

export const sampleOrders: Order[] = [
  {
    id: "SP-48291",
    date: "2026-05-02",
    status: "In transit",
    totalJod: 131,
    items: [{ productId: "sp-001", quantity: 1 }]
  },
  {
    id: "SP-47110",
    date: "2026-04-14",
    status: "Delivered",
    totalJod: 187,
    items: [
      { productId: "sp-003", quantity: 1 },
      { productId: "sp-006", quantity: 1 }
    ]
  }
];

export const collections = [
  {
    name: "Obsidian Reserve",
    line: "Dark extrait compositions with oud, incense, and architectural woods.",
    image: "linear-gradient(140deg,#050403,#1a1510,#705631)"
  },
  {
    name: "Royal Levant",
    line: "Amber, rose, and spice signatures inspired by ceremonial luxury.",
    image: "linear-gradient(140deg,#090605,#431325,#c19a53)"
  },
  {
    name: "Silk Rituals",
    line: "Polished musks, luminous florals, and modern skin fragrances.",
    image: "linear-gradient(140deg,#080808,#505246,#e6dcc7)"
  }
];
