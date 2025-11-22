import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your Supabase project's values.
// For production, keep keys out of source control and provide them via
// environment variables or secure config (app.json extra, secrets, etc.).
export const SUPABASE_URL = 'https://lenvpewznbavnszoutrm.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlbnZwZXd6bmJhdm5zem91dHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDE4NzYsImV4cCI6MjA3NzMxNzg3Nn0.-3zu93PypT3TfpXVJHTeYXlDrFAXjo57U8hduBRsvD0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
