import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseInstance = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
  }
} else {
  console.warn(
    'Supabase configuration is missing. Please check your environment variables: ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined in your .env file.'
  )
}

export const supabase = supabaseInstance


