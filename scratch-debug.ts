import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Manually read and parse .env file
const envPath = path.join(".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      const key = parts[0].trim();
      const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or VITE_SUPABASE_URL");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Get RLS policies on system_work_orders
  const { data: policies, error: policiesErr } = await supabase
    .rpc("get_policies", { table_name: "system_work_orders" });
  
  if (policiesErr) {
    // If get_policies RPC doesn't exist, we can try running a custom query if we can,
    // or just fetch system_work_orders directly to see what rows are visible with the service role key.
    console.log("Error checking policies via RPC:", policiesErr.message);
  } else {
    console.log("Policies found via RPC:", policies);
  }

  // Let's also check if we can query system_work_orders using the service role client
  const { data: allWorkOrders, error: allWOsErr } = await supabase
    .from("system_work_orders")
    .select("*");
  console.log("All system work orders visible to service role:", allWorkOrders?.length, allWOsErr || "");
}

run();
