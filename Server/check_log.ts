import 'dotenv/config';
import { getSupabaseAdmin } from './clients/supabase.server';

async function run() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('document_validation_findings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase Error:", error);
      return;
    }

    if (!data) {
      console.log("No findings found in database.");
      return;
    }

    console.log("Last Finding Details:");
    console.log("ID:", data.id);
    console.log("Created At:", data.created_at);
    console.log("Contractor ID:", data.contractor_user_id);
    console.log("Status:", data.validation_status);
    console.log("Score:", data.confidence_score);
    console.log("Findings JSON:", JSON.stringify(data.findings_json, null, 2));
    
    // Also fetch profile for this contractor
    if (data.contractor_user_id) {
      const { data: profile, error: pErr } = await supabase
        .from('contractor_profiles')
        .select('*')
        .eq('user_id', data.contractor_user_id)
        .maybeSingle();
      console.log("\nContractor Profile in DB:", pErr ? pErr : JSON.stringify(profile, null, 2));
    }
  } catch (err) {
    console.error("Execution error:", err);
  }
}

run();
