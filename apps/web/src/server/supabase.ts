import { createClient } from "@supabase/supabase-js";

// FIX: Use the variable name from your .env file
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client (full access). Do NOT import in client components.
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { 
    autoRefreshToken: false, // Recommended for server-side admin clients
    persistSession: false    // Correct: Keeps the client stateless
  }, 
});