-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create entries table for storing journal entries
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Entry data
  date DATE NOT NULL,
  transcript TEXT NOT NULL,
  
  -- AI-extracted insights
  wins TEXT[] DEFAULT '{}',
  regrets TEXT[] DEFAULT '{}',
  tasks TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  sentiment_score DECIMAL(3,2) DEFAULT 0.5 CHECK (sentiment_score >= 0 AND sentiment_score <= 1),
  
  -- Audio file references
  has_audio BOOLEAN DEFAULT false,
  audio_url TEXT,
  audio_path TEXT,
  audio_size INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per user per date
  UNIQUE(user_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX entries_user_id_idx ON entries(user_id);
CREATE INDEX entries_date_idx ON entries(date);
CREATE INDEX entries_created_at_idx ON entries(created_at);
CREATE INDEX entries_sentiment_score_idx ON entries(sentiment_score);
CREATE INDEX entries_keywords_idx ON entries USING GIN(keywords);
CREATE INDEX entries_transcript_search_idx ON entries USING GIN(to_tsvector('english', transcript));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_entries_updated_at_trigger
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_entries_updated_at();

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (will be enhanced in later migrations)
CREATE POLICY "Users can view their own entries" ON entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries" ON entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries" ON entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries" ON entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_entries BIGINT,
  entries_this_month BIGINT,
  entries_this_week BIGINT,
  avg_sentiment_score DECIMAL,
  most_common_keywords TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)) as entries_this_month,
    COUNT(*) FILTER (WHERE date >= date_trunc('week', CURRENT_DATE)) as entries_this_week,
    ROUND(AVG(sentiment_score), 2) as avg_sentiment_score,
    (
      SELECT ARRAY(
        SELECT unnest(keywords) as keyword
        FROM entries 
        WHERE user_id = target_user_id
        GROUP BY keyword
        ORDER BY COUNT(*) DESC
        LIMIT 10
      )
    ) as most_common_keywords
  FROM entries 
  WHERE user_id = target_user_id;
$$;

-- Create function to search entries
CREATE OR REPLACE FUNCTION search_entries(
  search_text TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  min_sentiment DECIMAL DEFAULT NULL,
  max_sentiment DECIMAL DEFAULT NULL,
  target_keywords TEXT[] DEFAULT NULL,
  target_user_id UUID DEFAULT auth.uid(),
  page_size INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  date DATE,
  transcript TEXT,
  wins TEXT[],
  regrets TEXT[],
  tasks TEXT[],
  keywords TEXT[],
  sentiment_score DECIMAL,
  has_audio BOOLEAN,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    e.id,
    e.date,
    e.transcript,
    e.wins,
    e.regrets,
    e.tasks,
    e.keywords,
    e.sentiment_score,
    e.has_audio,
    e.audio_url,
    e.created_at,
    e.updated_at
  FROM entries e
  WHERE e.user_id = target_user_id
    AND (search_text IS NULL OR to_tsvector('english', e.transcript) @@ plainto_tsquery('english', search_text))
    AND (start_date IS NULL OR e.date >= start_date)
    AND (end_date IS NULL OR e.date <= end_date)
    AND (min_sentiment IS NULL OR e.sentiment_score >= min_sentiment)
    AND (max_sentiment IS NULL OR e.sentiment_score <= max_sentiment)
    AND (target_keywords IS NULL OR e.keywords && target_keywords)
  ORDER BY e.date DESC, e.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
$$;