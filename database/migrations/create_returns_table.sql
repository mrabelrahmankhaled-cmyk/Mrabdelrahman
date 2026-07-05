-- Create returns table for store product refunds
CREATE TABLE IF NOT EXISTS store_returns (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_sale_id uuid REFERENCES store_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES store_products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  refund_amount numeric NOT NULL CHECK (refund_amount >= 0),
  reason text,
  is_damaged boolean DEFAULT false,
  refund_method text DEFAULT 'cash' CHECK (refund_method IN ('cash', 'wallet', 'credit')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT positive_refund CHECK (refund_amount > 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_store_returns_original_sale_id ON store_returns(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_store_returns_product_id ON store_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_store_returns_created_at ON store_returns(created_at);
CREATE INDEX IF NOT EXISTS idx_store_returns_created_by ON store_returns(created_by);

-- Add RLS policies
ALTER TABLE store_returns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see returns they created
CREATE POLICY "Users can view their own store returns" ON store_returns
  FOR SELECT USING (auth.uid() = created_by);

-- Policy: Admins can see all returns
CREATE POLICY "Admins can view all store returns" ON store_returns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Users can create returns
CREATE POLICY "Users can create store returns" ON store_returns
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Only admins can delete returns (for audit trail)
CREATE POLICY "Only admins can delete store returns" ON store_returns
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Trigger to update product stock when return is processed
CREATE OR REPLACE FUNCTION update_store_stock_on_return()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update stock if product is not damaged
  IF NOT NEW.is_damaged THEN
    UPDATE store_products 
    SET stock = stock + NEW.quantity,
        sold_count = GREATEST(sold_count - NEW.quantity, 0)
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_store_stock_on_return ON store_returns;
CREATE TRIGGER trigger_update_store_stock_on_return
  AFTER INSERT ON store_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_store_stock_on_return();

-- Function to calculate daily store refunds
CREATE OR REPLACE FUNCTION get_daily_store_refunds(target_date date DEFAULT CURRENT_DATE)
RETURNS numeric AS $$
DECLARE
  total_refunds numeric;
BEGIN
  SELECT COALESCE(SUM(refund_amount), 0) 
  INTO total_refunds
  FROM store_returns 
  WHERE DATE(created_at) = target_date;
  
  RETURN total_refunds;
END;
$$ LANGUAGE plpgsql;

-- View for daily store sales summary (including refunds)
CREATE OR REPLACE VIEW daily_store_sales_summary AS
WITH daily_sales AS (
  SELECT 
    DATE(created_at) as sale_date,
    SUM(price_sold) as gross_revenue,
    COUNT(id) as total_sales
  FROM store_sales
  GROUP BY DATE(created_at)
),
daily_refunds AS (
  SELECT 
    DATE(created_at) as refund_date,
    SUM(refund_amount) as total_refunds,
    COUNT(id) as refunds_count
  FROM store_returns
  GROUP BY DATE(created_at)
)
SELECT 
  ds.sale_date,
  ds.total_sales,
  COALESCE(ds.gross_revenue, 0) as gross_revenue,
  COALESCE(dr.total_refunds, 0) as total_refunds,
  COALESCE(ds.gross_revenue, 0) - COALESCE(dr.total_refunds, 0) as net_revenue,
  COALESCE(dr.refunds_count, 0) as refunds_count
FROM daily_sales ds
LEFT JOIN daily_refunds dr ON ds.sale_date = dr.refund_date
ORDER BY ds.sale_date DESC;

-- Function to get store sales with refunds for a specific date
CREATE OR REPLACE FUNCTION get_store_sales_with_refunds(target_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_sales numeric,
  total_refunds numeric,
  net_sales numeric,
  sales_count bigint,
  refunds_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.price_sold), 0) as total_sales,
    COALESCE((SELECT SUM(r.refund_amount) 
             FROM store_returns r 
             WHERE DATE(r.created_at) = target_date), 0) as total_refunds,
    COALESCE(SUM(s.price_sold), 0) - 
    COALESCE((SELECT SUM(r.refund_amount) 
             FROM store_returns r 
             WHERE DATE(r.created_at) = target_date), 0) as net_sales,
    COUNT(s.id) as sales_count,
    (SELECT COUNT(r.id) 
     FROM store_returns r 
     WHERE DATE(r.created_at) = target_date) as refunds_count
  FROM store_sales s 
  WHERE DATE(s.created_at) = target_date;
END;
$$ LANGUAGE plpgsql;
