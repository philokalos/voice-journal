-- Enable Row Level Security on all tables
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for entries table
-- Users can only see their own entries
CREATE POLICY "Users can view own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id::uuid);

-- Users can only insert entries for themselves
CREATE POLICY "Users can insert own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Users can only update their own entries
CREATE POLICY "Users can update own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id::uuid);

-- Users can only delete their own entries
CREATE POLICY "Users can delete own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id::uuid);

-- Create RLS policies for integrations table
-- Users can only see their own integrations
CREATE POLICY "Users can view own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id::uuid);

-- Users can only insert integrations for themselves
CREATE POLICY "Users can insert own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Users can only update their own integrations
CREATE POLICY "Users can update own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id::uuid);

-- Users can only delete their own integrations
CREATE POLICY "Users can delete own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id::uuid);

-- Create function to get current user profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    auth.uid() as id,
    auth.email() as email,
    (auth.jwt() ->> 'created_at')::timestamptz as created_at
$$;

-- Create function to check if user is admin (for future use)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data ->> 'role' = 'admin'
  );
$$;

-- Create audit log table for tracking data access and modifications
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- Create function to log data changes
CREATE OR REPLACE FUNCTION log_data_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, table_name, operation, record_id, old_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, table_name, operation, record_id, old_data, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, table_name, operation, record_id, new_data)
    VALUES (auth.uid(), TG_TABLE_NAME, TG_OP, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for audit logging
CREATE TRIGGER entries_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON entries
  FOR EACH ROW EXECUTE FUNCTION log_data_change();

CREATE TRIGGER integrations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON integrations
  FOR EACH ROW EXECUTE FUNCTION log_data_change();

-- Create data retention policy table
CREATE TABLE IF NOT EXISTS data_retention_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('delete_all', 'export_data')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  completion_deadline timestamptz GENERATED ALWAYS AS (requested_at + INTERVAL '72 hours') STORED,
  notes text
);

-- Enable RLS on data retention requests
ALTER TABLE data_retention_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data retention requests
CREATE POLICY "Users can view own retention requests" ON data_retention_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create their own data retention requests
CREATE POLICY "Users can create own retention requests" ON data_retention_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voices', 'voices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voices bucket
CREATE POLICY "Users can upload own voice files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own voice files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own voice files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own voice files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);