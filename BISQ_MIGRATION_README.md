# Bisq Payment Integration - Database Migration

## Overview

This migration extends your Symphony Labs e-commerce database to support **Bisq P2P cryptocurrency payments** alongside your existing **BTCPay Server integration**. The changes maintain full backward compatibility with your current BTCPay payment flow.

## What's Been Changed

### 1. Database Schema Updates

#### Extended `orders` Table
The `orders` table now supports both payment methods:

**New Fields:**
- `payment_method` (TEXT, NOT NULL, default: 'btcpay') - Distinguishes between 'btcpay' and 'bisq' payments
- `btc_amount` (DECIMAL 16,8) - BTC amount for Bisq trades
- `expires_at` (TIMESTAMP) - Expiration time for Bisq trades
- `coupon_code` (TEXT) - Coupon code applied to order
- `coupon_discount` (DECIMAL 10,2) - Discount amount from coupon

**Existing Fields Preserved:**
- All existing BTCPay fields (`btcpay_invoice_id`, etc.)
- All shipping fields
- All status tracking fields

#### New Tables Created

1. **`bisq_trades`** - Tracks Bisq-specific trade details
   - Links to orders via `order_id` foreign key
   - Stores trade state, BTC amount, payment details
   - Tracks deposit/payout status
   - Stores contract JSON and seller payment details

2. **`payment_accounts`** - Bisq payment method configuration
   - Maps payment method IDs to Bisq account IDs
   - Stores account details and active status

3. **`transaction_log`** - Audit trail for all transactions
   - Can reference both orders and Bisq trades
   - Logs event types and event data as JSONB
   - Provides compliance and debugging capabilities

4. **`system_config`** - System-wide configuration
   - Stores Bisq settings (trade limits, expiry times, poll intervals)
   - Key-value store for easy configuration updates

### 2. Application Code Updates

#### Order Creation API (`/src/app/api/orders/create/route.ts`)
- **Line 162**: Now explicitly sets `payment_method: "btcpay"` when creating orders
- This ensures all BTCPay orders are properly tagged in the database

### 3. Migration Files

#### Primary Migration File: `/supabase/bisq-migration.sql`
This is a **safe, idempotent migration** that can be run multiple times without errors:

- Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety
- Backfills existing orders with `payment_method = 'btcpay'`
- Creates new tables with `CREATE TABLE IF NOT EXISTS`
- Adds indexes for query performance
- Creates RLS policies matching your existing security model

#### Updated Schema: `/supabase/schema.sql`
The main schema file has been updated to reflect all changes, so new database deployments will have the complete schema from the start.

## How to Apply the Migration

### Option 1: Apply to Existing Database (Recommended)

1. **Open your Supabase dashboard** → SQL Editor
2. **Copy and paste** the entire contents of `/supabase/bisq-migration.sql`
3. **Click "Run"**
4. **Verify success** by checking that the new tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_name IN ('bisq_trades', 'payment_accounts', 'transaction_log', 'system_config');
   ```

### Option 2: Fresh Database Setup

If you're setting up a new database:
1. Simply run `/supabase/schema.sql` - it now includes everything

## Backward Compatibility

✅ **All existing functionality preserved:**
- Existing orders automatically tagged as `payment_method = 'btcpay'`
- BTCPay checkout flow unchanged
- Order status tracking unchanged
- Admin panel continues working without modifications

✅ **Safe migration:**
- Uses `IF NOT EXISTS` clauses
- No data loss or destructive operations
- Can be run multiple times safely

## Database Structure

### Payment Method Flow

```
┌─────────────────────────────────────────┐
│            orders table                  │
│  (unified for both payment methods)      │
├─────────────────────────────────────────┤
│  payment_method = 'btcpay' or 'bisq'    │
└─────────────────────────────────────────┘
          │                    │
          ├────────────────────┤
          ▼                    ▼
    ┌──────────┐         ┌────────────┐
    │ BTCPay   │         │ bisq_trades│
    │ invoice  │         │  (new)     │
    └──────────┘         └────────────┘
```

### Order Status Values

**BTCPay Orders:**
- `pending` → `paid` → `shipped` → `delivered`
- `cancelled` (if needed)

**Bisq Orders (for future implementation):**
- `pending` → `waiting_for_offer` → `offer_taken` → `awaiting_customer_payment` → `payment_sent_by_customer` → `waiting_seller_confirmation` → `btc_received` → `forwarding_to_btcpay` → `paid`
- `failed` or `expired` (if issues occur)

## Verification

After applying the migration, verify everything works:

### 1. Check Database Structure
```sql
-- Verify new columns in orders table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('payment_method', 'btc_amount', 'expires_at', 'coupon_code', 'coupon_discount');

-- Verify new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('bisq_trades', 'payment_accounts', 'transaction_log', 'system_config');

-- Check existing orders were backfilled
SELECT payment_method, COUNT(*)
FROM orders
GROUP BY payment_method;
```

### 2. Test BTCPay Flow
1. Create a new order through your website
2. Verify the order has `payment_method = 'btcpay'` in the database
3. Complete payment through BTCPay
4. Verify order status updates correctly

### 3. Check System Config
```sql
SELECT * FROM system_config;
```
You should see 4 Bisq configuration entries:
- `order_expiry_hours` = 2
- `min_trade_amount_btc` = 0.001
- `max_trade_amount_btc` = 0.1
- `poll_interval_ms` = 30000

## Next Steps (When Ready to Implement Bisq)

The database is now ready for Bisq integration. When you're ready to implement the Bisq payment flow:

1. **Create Bisq API routes** (similar to `/api/btcpay/*`)
   - `/api/bisq/create-trade`
   - `/api/bisq/trade/[tradeId]`
   - `/api/bisq/confirm-payment`

2. **Update checkout page** to offer payment method selection
   - BTCPay (existing)
   - Bisq (new option)

3. **Create Bisq payment component** (similar to `CustomBTCPayCheckout`)
   - Poll trade status
   - Display payment instructions
   - Handle trade state updates

4. **Implement backend Bisq client**
   - Connect to Bisq daemon/API
   - Create offers
   - Monitor trade states
   - Forward BTC to BTCPay when received

## Files Modified

```
/supabase/bisq-migration.sql              (NEW - migration file)
/supabase/schema.sql                      (UPDATED - extended schema)
/src/app/api/orders/create/route.ts       (UPDATED - line 162)
/BISQ_MIGRATION_README.md                 (NEW - this file)
```

## Support and Troubleshooting

### Common Issues

**Issue:** Migration fails with "column already exists"
**Solution:** This is safe to ignore - the migration uses `IF NOT EXISTS` clauses

**Issue:** Existing orders don't have `payment_method` set
**Solution:** Re-run the migration - the UPDATE statement will backfill them

**Issue:** Application errors after migration
**Solution:** Verify the order creation API was updated (line 162 in `/src/app/api/orders/create/route.ts`)

### Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Remove new columns from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method;
ALTER TABLE orders DROP COLUMN IF EXISTS btc_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS expires_at;

-- Drop new tables
DROP TABLE IF EXISTS transaction_log CASCADE;
DROP TABLE IF EXISTS bisq_trades CASCADE;
DROP TABLE IF EXISTS payment_accounts CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
```

**Note:** Only rollback if absolutely necessary - you will lose Bisq-related data.

## Questions?

For questions or issues with this migration, please contact your development team or file an issue in your project repository.

---

**Migration prepared for Symphony Labs**
**Compatible with BTCPay Server + Bisq integration**
**Maintains backward compatibility with existing orders**
