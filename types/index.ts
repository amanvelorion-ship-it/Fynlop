export type ProductCategory = "Comics" | "Books" | "Manga";

export type Product = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  price_inr: number;
  price_usd: number;
  category: ProductCategory;
  author: string;
  pages: number;
  popularity: number;
  created_at: string;
  featured: boolean;
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
};

type ProductRow = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  price_inr: number;
  price_usd: number;
  file_url: string | null;
  category: ProductCategory;
  popularity: number;
  author: string;
  pages: number;
  featured: boolean;
  preview_images: string[];
  created_at: string;
};

type OrderRow = {
  id: string;
  user_id: string;
  product_id: string;
  payment_id: string;
  amount: number;
  status: Order["status"];
  razorpay_mode: Order["razorpay_mode"];
  created_at: string;
};

type AdminSettingsRow = {
  id: number;
  site_name: string;
  tagline: string;
  logo_url: string | null;
  support_email: string;
  razorpay_mode: "test" | "live";
  maintenance_mode: boolean;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: Omit<ProductRow, "created_at" | "file_url" | "popularity" | "featured" | "preview_images" | "author" | "pages"> &
          Partial<Pick<ProductRow, "created_at" | "file_url" | "popularity" | "featured" | "preview_images" | "author" | "pages">>;
        Update: Partial<ProductRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at"> &
          Partial<Pick<OrderRow, "id" | "created_at">>;
        Update: Partial<OrderRow>;
        Relationships: [];
      };
      admin_settings: {
        Row: AdminSettingsRow;
        Insert: Omit<AdminSettingsRow, "updated_at"> & Partial<Pick<AdminSettingsRow, "updated_at">>;
        Update: Partial<AdminSettingsRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
