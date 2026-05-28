export type Currency = "JOD" | "USD";
export type Language = "en" | "ar";

export type Product = {
  id: string;
  slug: string;
  name: string;
  arabicName: string;
  collection: string;
  category: string;
  gender: "Feminine" | "Masculine" | "Unisex";
  concentration: string;
  priceJod: number;
  inventory: number;
  rating: number;
  reviewCount: number;
  image: string;
  aura: string;
  description: string;
  notes: {
    top: string[];
    heart: string[];
    base: string[];
  };
  tags: string[];
  mood: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Review = {
  id: string;
  productId: string;
  name: string;
  location: string;
  rating: number;
  body: string;
  date: string;
};

export type Order = {
  id: string;
  date: string;
  status: "Preparing" | "In transit" | "Delivered";
  totalJod: number;
  items: CartItem[];
};
