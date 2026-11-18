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
  archived?: boolean;
  preview_images?: string[];
  file_url?: string | null;
};

export type CollectionPlan = {
  mode: "test" | "live";
  price_paise: number;
  plan_id: string;
  created_at: string;
};

export type Collection = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  monthly_price_paise: number;
  plans: CollectionPlan[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
};

export type PublicCollection = Omit<Collection, "plans" | "status">;

export type CollectionContentKind = "chapter" | "episode" | "issue" | "volume";

export type CollectionContent = {
  id: string;
  collection_id: string;
  title: string;
  description: string;
  kind: CollectionContentKind;
  file_key: string;
  release_at: string;
  published: boolean;
  created_at: string;
};

export type PublicCollectionContent = Omit<CollectionContent, "file_key" | "published">;

export type CollectionSubscriptionStatus =
  | "created"
  | "authenticated"
  | "active"
  | "payment_failed"
  | "cancelled"
  | "completed"
  | "expired";

export type CollectionSubscription = {
  id: string;
  user_id: string;
  email: string;
  collection_id: string;
  collection_title: string;
  razorpay_subscription_id: string;
  razorpay_plan_id: string;
  razorpay_mode: "test" | "live";
  amount_paise: number;
  status: CollectionSubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  paid_through: string | null;
  last_paid_payment_id: string | null;
  cancel_at_period_end: boolean;
  last_status_event_at: number;
  created_at: string;
  updated_at: string;
};

export type CollectionSubscriptionPayment = {
  id: string;
  subscription_id: string;
  user_id: string;
  collection_id: string;
  razorpay_mode: "test" | "live";
  amount_paise: number;
  currency: "INR";
  status: "captured" | "failed" | "refunding" | "refunded";
  created_at: string;
  access_until: string | null;
  error_description?: string | null;
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
