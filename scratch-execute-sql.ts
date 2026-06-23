import fs from "fs";
import path from "path";
import { Client } from "pg";

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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in process.env");
  process.exit(1);
}

if (connectionString.includes("YOUR_PASSWORD")) {
  console.error("DATABASE_URL contains the placeholder password 'YOUR_PASSWORD'. Please update .env with the correct password.");
  process.exit(1);
}

console.log("Connecting to PostgreSQL...");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase cloud DB connection
});

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL successfully!");
  
  const sql = `
    DROP POLICY IF EXISTS "system_work_orders_select_for_managers" ON public.system_work_orders;
    CREATE POLICY "system_work_orders_select_for_managers" ON public.system_work_orders
      FOR SELECT USING (public.is_manager());
  `;

  await client.query(sql);
  console.log("SQL policy executed successfully!");
  await client.end();
}

run().catch(err => {
  console.error("Failed to execute SQL:", err);
  process.exit(1);
});
