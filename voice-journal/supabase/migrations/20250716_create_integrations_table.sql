-- Create integrations table for storing OAuth tokens and integration status
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_sheets', 'notion', etc.
  
  -- OAuth token data (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Integration specific data
  spreadsheet_id TEXT, -- For Google Sheets
  sheet_name TEXT DEFAULT 'Voice Journal',
  
  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one integration per user per provider
  UNIQUE(user_id, provider)
);

-- Create index for efficient queries
CREATE INDEX integrations_user_id_idx ON integrations(user_id);
CREATE INDEX integrations_provider_idx ON integrations(provider);
CREATE INDEX integrations_status_idx ON integrations(status);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own integrations" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integrations" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integrations" ON integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integrations" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_integrations_updated_at_trigger
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_integrations_updated_at();

-- Create sync_logs table to track synchronization history
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type TEXT NOT NULL CHECK (sync_type IN ('create', 'update', 'delete')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  
  -- External reference (e.g., Google Sheets row number)
  external_id TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one sync log per entry per integration
  UNIQUE(integration_id, entry_id)
);

-- Create index for efficient queries
CREATE INDEX sync_logs_integration_id_idx ON sync_logs(integration_id);
CREATE INDEX sync_logs_entry_id_idx ON sync_logs(entry_id);
CREATE INDEX sync_logs_status_idx ON sync_logs(status);

-- Enable Row Level Security for sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_logs
CREATE POLICY "Users can view their own sync logs" ON sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE integrations.id = sync_logs.integration_id 
      AND integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert sync logs" ON sync_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE integrations.id = sync_logs.integration_id 
      AND integrations.user_id = auth.uid()
    )
  );

CREATE POLICY "System can update sync logs" ON sync_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE integrations.id = sync_logs.integration_id 
      AND integrations.user_id = auth.uid()
    )
  );