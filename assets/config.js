// 1) En Supabase: Project Settings -> API
// 2) Pega aquí tu Project URL y tu anon/publishable key (NUNCA uses service_role en frontend)
// 3) Sirve la carpeta "simple" con un servidor local (no file://), ej: npx serve simple
const SUPABASE_URL = 'https://thjanybdqvoeakbwofqy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V8vE5O20gYcl7ZxHyz7Frw_jYbnw3I9';

const TICKET_PRICE = 8.5; // precio por entrada (tu tabla funcion no tiene precio)

const isSupabaseConfigured =
  SUPABASE_URL &&
  SUPABASE_URL.indexOf('TU-PROYECTO') === -1 &&
  /^https?:\/\//i.test(SUPABASE_URL) &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY.indexOf('TU_ANON_KEY') === -1 &&
  typeof window.supabase !== 'undefined';

const db = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
