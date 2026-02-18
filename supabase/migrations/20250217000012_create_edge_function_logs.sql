-- Create edge_function_logs table
CREATE TABLE IF NOT EXISTS edge_function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  execution_id UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  request_payload JSONB,
  response_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  invoked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invoked_by_role TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function ON edge_function_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_status ON edge_function_logs(status);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_created_at ON edge_function_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_execution_id ON edge_function_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_function_status_time ON edge_function_logs(function_name, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_error_code ON edge_function_logs(error_code) WHERE error_code IS NOT NULL;

-- Enable RLS
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "admins_see_all_function_logs"
  ON edge_function_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to archive old logs (optional)
CREATE OR REPLACE FUNCTION archive_old_function_logs()
RETURNS void AS $$
BEGIN
  -- Archive logs older than 90 days (move to separate archive table or delete)
  DELETE FROM edge_function_logs
  WHERE created_at < now() - INTERVAL '90 days'
  AND status = 'success';
  
  -- Keep error logs longer (180 days)
  DELETE FROM edge_function_logs
  WHERE created_at < now() - INTERVAL '180 days'
  AND status = 'error';
END;
$$ LANGUAGE plpgsql;
