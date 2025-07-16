-- Create entries table for voice journal entries
CREATE TABLE entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    transcript TEXT NOT NULL,
    wins TEXT[] DEFAULT '{}',
    regrets TEXT[] DEFAULT '{}',
    tasks TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    sentiment_score DECIMAL(3,2) DEFAULT 0.0,
    audio_file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_created_at ON entries(created_at);
CREATE INDEX idx_entries_user_date ON entries(user_id, date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_entries_updated_at 
    BEFORE UPDATE ON entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own entries
CREATE POLICY "Users can view their own entries" 
    ON entries 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own entries
CREATE POLICY "Users can insert their own entries" 
    ON entries 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only update their own entries
CREATE POLICY "Users can update their own entries" 
    ON entries 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Create policy: Users can only delete their own entries
CREATE POLICY "Users can delete their own entries" 
    ON entries 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-recordings',
    'audio-recordings',
    false,
    10485760, -- 10MB limit
    ARRAY['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']
);

-- Create storage policy: Users can only access their own audio files
CREATE POLICY "Users can upload their own audio files" 
    ON storage.objects 
    FOR INSERT 
    WITH CHECK (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
    ON storage.objects 
    FOR UPDATE 
    USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
    ON storage.objects 
    FOR DELETE 
    USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);