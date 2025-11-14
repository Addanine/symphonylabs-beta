-- ================================================================
-- Bisq Payment Integration Migration
-- ================================================================
-- This migration extends the existing database to support Bisq P2P payments
-- while maintaining full backward compatibility with BTCPay payments.
--
-- Safe to run multiple times (uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS)
-- All existing orders will be automatically tagged as 'btcpay' payment method
-- ================================================================

-- ================================================================
-- STEP 1: Extend Orders Table for Multi-Payment Support
-- ================================================================

-- Add payment_method column to distinguish between BTCPay and Bisq
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'btcpay';

-- Add Bisq-specific fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS btc_amount DECIMAL(16, 8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add coupon fields (if not already present from previous migrations)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2);

-- Backfill existing orders to use BTCPay payment method
UPDATE orders
SET payment_method = 'btcpay'
WHERE payment_method IS NULL;

-- Make payment_method NOT NULL after backfilling
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'payment_method'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;
    ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'btcpay';
  END IF;
END $$;

-- Update status comment to include Bisq statuses
COMMENT ON COLUMN orders.status IS 'Order status: pending, paid, shipped, delivered, cancelled (BTCPay + Bisq). Bisq-specific: waiting_for_offer, offer_taken, awaiting_customer_payment, payment_sent_by_customer, waiting_seller_confirmation, btc_received, forwarding_to_btcpay, failed, expired';

-- ================================================================
-- STEP 2: Create Bisq Trades Table
-- ================================================================

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

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read bisq_trades" ON bisq_trades;
DROP POLICY IF EXISTS "Allow public insert bisq_trades" ON bisq_trades;
DROP POLICY IF EXISTS "Allow public update bisq_trades" ON bisq_trades;

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

-- ================================================================
-- STEP 3: Create Payment Accounts Table
-- ================================================================

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

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read payment_accounts" ON payment_accounts;
DROP POLICY IF EXISTS "Allow public insert payment_accounts" ON payment_accounts;
DROP POLICY IF EXISTS "Allow public update payment_accounts" ON payment_accounts;

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

-- ================================================================
-- STEP 4: Create Transaction Log Table
-- ================================================================

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

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read transaction_log" ON transaction_log;
DROP POLICY IF EXISTS "Allow public insert transaction_log" ON transaction_log;

-- Create policies for transaction_log
CREATE POLICY "Allow public read transaction_log" ON transaction_log
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert transaction_log" ON transaction_log
  FOR INSERT
  TO public
  WITH CHECK (true);

-- ================================================================
-- STEP 5: Create System Config Table
-- ================================================================

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

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read system_config" ON system_config;
DROP POLICY IF EXISTS "Allow public insert system_config" ON system_config;
DROP POLICY IF EXISTS "Allow public update system_config" ON system_config;

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

-- Insert Bisq system configuration (safe for re-runs)
INSERT INTO system_config (key, value) VALUES
  ('order_expiry_hours', '2'),
  ('min_trade_amount_btc', '0.001'),
  ('max_trade_amount_btc', '0.1'),
  ('poll_interval_ms', '30000')
ON CONFLICT (key) DO NOTHING;

-- ================================================================
-- STEP 6: Create Indexes for Performance
-- ================================================================

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Bisq trades indexes
CREATE INDEX IF NOT EXISTS idx_bisq_trades_order_id ON bisq_trades(order_id);
CREATE INDEX IF NOT EXISTS idx_bisq_trades_trade_id ON bisq_trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_bisq_trades_trade_state ON bisq_trades(trade_state);

-- Transaction log indexes
CREATE INDEX IF NOT EXISTS idx_transaction_log_order_id ON transaction_log(order_id);
CREATE INDEX IF NOT EXISTS idx_transaction_log_bisq_trade_id ON transaction_log(bisq_trade_id);
CREATE INDEX IF NOT EXISTS idx_transaction_log_created ON transaction_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_log_event_type ON transaction_log(event_type);

-- ================================================================
-- STEP 7: Verification Queries (Optional - Comment Out)
-- ================================================================

-- Uncomment these to verify the migration was successful
-- SELECT COUNT(*), payment_method FROM orders GROUP BY payment_method;
-- SELECT * FROM system_config WHERE key LIKE '%bisq%' OR key LIKE '%trade%';
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('bisq_trades', 'payment_accounts', 'transaction_log', 'system_config');

-- ================================================================
-- Migration Complete
-- ================================================================
-- Your database now supports both BTCPay and Bisq payment methods!
--
-- BTCPay Orders:
--   - payment_method = 'btcpay'
--   - Uses btcpay_invoice_id field
--   - All existing orders automatically set to 'btcpay'
--
-- Bisq Orders (when implemented):
--   - payment_method = 'bisq'
--   - Creates order record + bisq_trades record
--   - Uses btc_amount and expires_at fields
--   - Transaction log for audit trail
--
-- Next Steps:
--   1. Update order creation API to explicitly set payment_method = 'btcpay'
--   2. Test existing BTCPay checkout flow
--   3. Implement Bisq payment flow when ready
-- ================================================================
