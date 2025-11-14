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

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  btcpay_invoice_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
  total_amount DECIMAL(10, 2) NOT NULL,
  items JSONB NOT NULL,

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

-- Create storage bucket for product images (run this in Supabase Dashboard or via API)
-- This is a comment for reference - execute in Supabase Dashboard > Storage
-- Bucket name: product-images
-- Public: true
