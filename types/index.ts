export type ProductCategory = "Comics" | "Books" | "Manga";

export type Product = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  price_inr: number;
  category: ProductCategory;
  author: string;
  pages: number;
  popularity: number;
  created_at: string;
  featured: boolean;
  archived?: boolean;
  preview_images?: string[];
  file_url?: string | null;
};

export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  payment_id: string;
  amount: number;
  status: "created" | "paid" | "failed" | "refunding" | "refunded";
  razorpay_mode: "test" | "live";
  created_at: string;
};

export type User = {
  id: string;
  email: string;
  created_at: string;
  blocked?: boolean;
  auth_username?: string;
};

export type AdminSettings = {
  PK: string;
  SK: string;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  support_email: string;
  razorpay_mode: "test" | "live";
  maintenance_mode: boolean;
  updated_at: string;
};
