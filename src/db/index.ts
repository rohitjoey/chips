import { Database } from "@/lib/database.types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || "https://iruntmqacogzlybgbcge.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "secretKey";
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
