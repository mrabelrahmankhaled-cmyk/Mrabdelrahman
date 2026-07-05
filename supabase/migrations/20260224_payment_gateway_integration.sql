-- Add Paymob settings to center_settings
ALTER TABLE center_settings 
ADD COLUMN IF NOT EXISTS paymob_api_key TEXT,
ADD COLUMN IF NOT EXISTS paymob_integration_id_fawry TEXT,
ADD COLUMN IF NOT EXISTS paymob_integration_id_card TEXT,
ADD COLUMN IF NOT EXISTS paymob_iframe_id TEXT,
ADD COLUMN IF NOT EXISTS paymob_hmac_secret TEXT;

-- Create table for payment transactions
CREATE TABLE IF NOT EXISTS student_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    center_id UUID REFERENCES centers(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'EGP',
    status TEXT DEFAULT 'pending', -- pending, success, failed, expired
    payment_method TEXT, -- paymob_fawry, paymob_card, mobile_wallet
    external_order_id TEXT, -- Paymob Order ID
    payment_reference TEXT, -- Fawry Reference Number or Transaction ID
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE student_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for students to see their own transactions
CREATE POLICY "Students can view their own transactions" 
ON student_payment_transactions FOR SELECT 
TO authenticated 
USING (auth.uid() = student_id);

-- Policies for admins to see their center's transactions
CREATE POLICY "Admins can view their center's transactions" 
ON student_payment_transactions FOR SELECT 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM staff_profiles 
    WHERE id = auth.uid() AND center_id = student_payment_transactions.center_id
));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_payment_transactions_updated_at
    BEFORE UPDATE ON student_payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
