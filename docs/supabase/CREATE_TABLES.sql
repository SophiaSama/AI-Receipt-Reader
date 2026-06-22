-- ============================================================================
-- Supabase Database Schema for AI Receipt Reader
-- Converted from DynamoDB to PostgreSQL
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RECEIPTS TABLE
-- Main table for storing receipt metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'SGD' CHECK (currency ~ '^[A-Z]{3}$'),
  image_url TEXT,
  raw_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- RECEIPT ITEMS TABLE
-- Stores individual items from each receipt
-- ============================================================================
CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying receipts by date (frequently used for date-range queries)
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date DESC);

-- Index for querying receipts by merchant name (for searching specific stores)
CREATE INDEX IF NOT EXISTS idx_receipts_merchant_name ON receipts(merchant_name);

-- Index for querying receipts by creation date (for chronological sorting)
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);

-- Index for querying receipt items by receipt ID (foreign key lookup)
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- Composite index for efficient date range queries with sorting
CREATE INDEX IF NOT EXISTS idx_receipts_date_created ON receipts(date DESC, created_at DESC);

-- ============================================================================
-- CONSTRAINTS & VALIDATIONS
-- ============================================================================

-- Ensure total is not negative
ALTER TABLE receipts ADD CONSTRAINT check_total_positive CHECK (total >= 0);

-- Ensure price is not negative
ALTER TABLE receipt_items ADD CONSTRAINT check_price_positive CHECK (price >= 0);

-- Ensure merchant name is not empty
ALTER TABLE receipts ADD CONSTRAINT check_merchant_name_not_empty CHECK (merchant_name != '');

-- ============================================================================
-- VIEWS (Optional - for convenience queries)
-- ============================================================================

-- View for getting receipts with their items aggregated
CREATE OR REPLACE VIEW v_receipts_with_items AS
SELECT
  r.id,
  r.merchant_name,
  r.date,
  r.total,
  r.currency,
  r.image_url,
  r.raw_text,
  r.created_at,
  json_agg(
    json_build_object(
      'id', ri.id,
      'description', ri.description,
      'price', ri.price
    ) ORDER BY ri.created_at
  ) FILTER (WHERE ri.id IS NOT NULL) as items
FROM receipts r
LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
GROUP BY r.id, r.merchant_name, r.date, r.total, r.currency, r.image_url, r.raw_text, r.created_at;

-- ============================================================================
-- FUNCTIONS (Optional - for auto-updating updated_at timestamp)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function
CREATE TRIGGER update_receipts_updated_at
BEFORE UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO receipts (merchant_name, date, total, currency, image_url, raw_text)
VALUES (
  'Whole Foods Market',
  '2026-01-21',
  87.45,
  'SGD',
  'https://smart-receipt-images-123456789.s3.us-east-1.amazonaws.com/receipts/sample.jpg',
  'WHOLE FOODS MARKET\n123 Main St\nDate: 01/21/2026\n\nOrganic Bananas 2lb $3.99\nGreek Yogurt $5.49\n...'
);

-- Get the last inserted receipt ID
-- INSERT INTO receipt_items (receipt_id, description, price) VALUES
-- (
--   (SELECT id FROM receipts ORDER BY created_at DESC LIMIT 1),
--   'Organic Bananas 2lb',
--   3.99
-- );
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
