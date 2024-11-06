import { createClient } from "@supabase/supabase-js";
const supabaseUrl =
  process.env.SUPABASE_URL || "https://iruntmqacogzlybgbcge.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "secretKey";
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
