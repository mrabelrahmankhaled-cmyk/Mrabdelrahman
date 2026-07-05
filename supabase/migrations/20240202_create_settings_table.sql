-- Create settings table for center configuration
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default center settings
INSERT INTO settings (key, value) VALUES 
('center_info', '{"name": "Smart Center", "logo": "SC", "description": "مركزك التعليمي الأول"}')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy for settings (read-only for all users)
CREATE POLICY "Settings are viewable by all users" ON settings
  FOR SELECT USING (true);
