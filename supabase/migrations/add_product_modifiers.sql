-- Migration: Add product modifiers support
-- This migration adds support for product options/modifiers with conditional dependencies and price adjustments
-- Run this in your Supabase SQL Editor

-- Add modifiers column to products table (JSONB for storing modifier groups and options)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS modifiers JSONB;

-- Add comment to document the new column
COMMENT ON COLUMN products.modifiers IS 'Product customization options with conditional dependencies and price adjustments. Stores array of modifier groups with options.';

-- Example of modifiers structure:
-- [
--   {
--     "id": "group_1",
--     "label": "Label Color",
--     "required": true,
--     "options": [
--       {
--         "id": "opt_1",
--         "label": "Green",
--         "priceAdjustment": 0
--       },
--       {
--         "id": "opt_2",
--         "label": "Blue",
--         "priceAdjustment": 5.00
--       }
--     ]
--   },
--   {
--     "id": "group_2",
--     "label": "Premium Packaging",
--     "required": false,
--     "options": [
--       {
--         "id": "opt_3",
--         "label": "Standard",
--         "priceAdjustment": 0
--       },
--       {
--         "id": "opt_4",
--         "label": "Premium Box",
--         "priceAdjustment": 10.00,
--         "dependsOn": {
--           "groupId": "group_1",
--           "optionId": "opt_2"
--         }
--       }
--     ]
--   }
-- ]

-- Verify the changes
SELECT
  id,
  name,
  price,
  modifiers
FROM products
LIMIT 5;
