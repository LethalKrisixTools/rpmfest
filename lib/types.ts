export type Product = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  price_cents: number;
  stock: number | null;
  category: string | null;
  images: string[];
  active: boolean;
  featured: boolean;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  default_city: string | null;
  default_postal_code: string | null;
  role: 'customer' | 'admin';
  terms_accepted_at: string | null;
};

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'expired';

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  amount_cents: number;
  currency: string;
  status: OrderStatus;
  mollie_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price_cents: number;
  image: string | null;
  qty: number;
};

export type CartLine = { productId: string; qty: number };
