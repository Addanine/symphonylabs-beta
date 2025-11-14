-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT,
  image TEXT NOT NULL,
  images TEXT[], -- Array of image URLs for product carousel
  modifiers JSONB, -- Product customization options with conditional dependencies and price adjustments
  stock INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON products;
DROP POLICY IF EXISTS "Allow authenticated insert" ON products;
DROP POLICY IF EXISTS "Allow authenticated update" ON products;
DROP POLICY IF EXISTS "Allow authenticated delete" ON products;

-- Create policy to allow anyone to read products
CREATE POLICY "Allow public read access" ON products
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow anyone to insert products (auth handled at app level)
CREATE POLICY "Allow public insert" ON products
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy to allow anyone to update products (auth handled at app level)
CREATE POLICY "Allow public update" ON products
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policy to allow anyone to delete products (auth handled at app level)
CREATE POLICY "Allow public delete" ON products
  FOR DELETE
  TO public
  USING (true);

-- Insert initial products
INSERT INTO products (name, price, description, image) VALUES
  ('een', 99.99, 'premium digital product with advanced features and capabilities', '/products/een.jpg'),
  ('prog', 149.99, 'professional-grade solution for power users and developers', '/products/prog.jpg')
ON CONFLICT DO NOTHING;

-- Create orders table (supports both BTCPay and Bisq payments)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,

  -- Payment info (BTCPay or Bisq)
  payment_method TEXT NOT NULL DEFAULT 'btcpay', -- 'btcpay' or 'bisq'
  btcpay_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, paid, shipped, delivered, cancelled
  -- Bisq-specific: waiting_for_offer, offer_taken, awaiting_customer_payment,
  --               payment_sent_by_customer, waiting_seller_confirmation,
  --               btc_received, forwarding_to_btcpay, failed, expired

  total_amount DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,

  -- Bisq-specific fields
  btc_amount DECIMAL(16, 8), -- BTC amount for Bisq trades
  expires_at TIMESTAMP WITH TIME ZONE, -- For Bisq trade expiration

  -- Coupon fields
  coupon_code TEXT,
  coupon_discount DECIMAL(10, 2),

  -- Shipping address
  shipping_name TEXT NOT NULL,
  shipping_email TEXT,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  shipping_phone TEXT,

  -- Shipping info
  shipping_carrier TEXT,
  shipping_service TEXT,
  tracking_number TEXT,
  shipping_label_url TEXT,
  shipping_tracking_url TEXT,
  shipping_cost DECIMAL(10, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE
);

-- Create trigger for orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;

-- Create policies
CREATE POLICY "Allow public read orders" ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert orders" ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update orders" ON orders
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch TEXT NOT NULL,
  purity TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for lab_tests table
DROP TRIGGER IF EXISTS update_lab_tests_updated_at ON lab_tests;
CREATE TRIGGER update_lab_tests_updated_at
  BEFORE UPDATE ON lab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read lab_tests" ON lab_tests;
DROP POLICY IF EXISTS "Allow public insert lab_tests" ON lab_tests;
DROP POLICY IF EXISTS "Allow public update lab_tests" ON lab_tests;
DROP POLICY IF EXISTS "Allow public delete lab_tests" ON lab_tests;

-- Create policies for lab_tests
CREATE POLICY "Allow public read lab_tests" ON lab_tests
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert lab_tests" ON lab_tests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update lab_tests" ON lab_tests
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete lab_tests" ON lab_tests
  FOR DELETE
  TO public
  USING (true);

-- Create banner table
CREATE TABLE IF NOT EXISTS banner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for banner table
DROP TRIGGER IF EXISTS update_banner_updated_at ON banner;
CREATE TRIGGER update_banner_updated_at
  BEFORE UPDATE ON banner
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE banner ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read banner" ON banner;
DROP POLICY IF EXISTS "Allow public insert banner" ON banner;
DROP POLICY IF EXISTS "Allow public update banner" ON banner;
DROP POLICY IF EXISTS "Allow public delete banner" ON banner;

-- Create policies for banner
CREATE POLICY "Allow public read banner" ON banner
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert banner" ON banner
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update banner" ON banner
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete banner" ON banner
  FOR DELETE
  TO public
  USING (true);

-- Insert initial banner (optional)
INSERT INTO banner (text, color) VALUES
  ('welcome to symphony labs - free shipping on orders over $100', '#000000')
ON CONFLICT DO NOTHING;

-- Bisq trades table (tracks Bisq payment details for orders)
CREATE TABLE IF NOT EXISTS bisq_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  trade_id TEXT UNIQUE NOT NULL,
  offer_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'BUY' or 'SELL'
  payment_method TEXT NOT NULL,
  btc_amount DECIMAL(16, 8) NOT NULL,
  fiat_amount DECIMAL(10, 2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  trade_state TEXT NOT NULL,
  deposit_published BOOLEAN DEFAULT FALSE,
  deposit_confirmed BOOLEAN DEFAULT FALSE,
  fiat_sent BOOLEAN DEFAULT FALSE,
  fiat_received BOOLEAN DEFAULT FALSE,
  payout_published BOOLEAN DEFAULT FALSE,
  seller_payment_details JSONB,
  contract_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for bisq_trades table
DROP TRIGGER IF EXISTS update_bisq_trades_updated_at ON bisq_trades;
CREATE TRIGGER update_bisq_trades_updated_at
  BEFORE UPDATE ON bisq_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE bisq_trades ENABLE ROW LEVEL SECURITY;

-- Create policies for bisq_trades
CREATE POLICY "Allow public read bisq_trades" ON bisq_trades
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert bisq_trades" ON bisq_trades
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update bisq_trades" ON bisq_trades
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Payment accounts mapping (Bisq payment methods configuration)
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id TEXT UNIQUE NOT NULL,
  payment_method_name TEXT NOT NULL,
  bisq_account_id TEXT NOT NULL,
  account_details JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_accounts
CREATE POLICY "Allow public read payment_accounts" ON payment_accounts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert payment_accounts" ON payment_accounts
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update payment_accounts" ON payment_accounts
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Transaction log (audit trail for both payment methods)
CREATE TABLE IF NOT EXISTS transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  bisq_trade_id UUID REFERENCES bisq_trades(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transaction_log ENABLE ROW LEVEL SECURITY;

-- Create policies for transaction_log
CREATE POLICY "Allow public read transaction_log" ON transaction_log
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert transaction_log" ON transaction_log
  FOR INSERT
  TO public
  WITH CHECK (true);

-- System configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for system_config table
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for system_config
CREATE POLICY "Allow public read system_config" ON system_config
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert system_config" ON system_config
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update system_config" ON system_config
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert system config for Bisq
INSERT INTO system_config (key, value) VALUES
  ('order_expiry_hours', '2'),
  ('min_trade_amount_btc', '0.001'),
  ('max_trade_amount_btc', '0.1'),
  ('poll_interval_ms', '30000')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_bisq_trades_order_id ON bisq_trades(order_id);
CREATE INDEX IF NOT EXISTS idx_bisq_trades_trade_id ON bisq_trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_bisq_trades_trade_state ON bisq_trades(trade_state);
CREATE INDEX IF NOT EXISTS idx_transaction_log_order_id ON transaction_log(order_id);
CREATE INDEX IF NOT EXISTS idx_transaction_log_created ON transaction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_tests_product_id ON lab_tests(product_id);

-- Create storage bucket for product images (run this in Supabase Dashboard or via API)
-- This is a comment for reference - execute in Supabase Dashboard > Storage
-- Bucket name: product-images
-- Public: true
