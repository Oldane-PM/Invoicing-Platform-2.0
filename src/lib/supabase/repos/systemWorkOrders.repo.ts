import { SupabaseClient } from "@supabase/supabase-js";

export type WorkOrderStatus =
  | "DRAFT"
  | "PENDING_CONTRACTOR_SIGNATURE"
  | "PENDING_FINANCE_SIGNATURE"
  | "COMPLETED";

export interface SystemWorkOrder {
  id: string;
  contractor_user_id: string;
  created_by_id: string;
  status: WorkOrderStatus;
  role: string;
  pay_type: string;
  pay_amount: number;
  start_date: string;
  end_date: string;
  work_schedule: string;
  additional_terms: string;
  contractor_signature_name?: string | null;
  contractor_signature_data?: string | null;
  contractor_signed_at?: string | null;
  finance_signature_name?: string | null;
  finance_signature_data?: string | null;
  finance_signed_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contractor_name?: string;
  contractor_email?: string;
  contractor_address?: string;
}

// Ensure schema is fully available
const getClient = (supabaseClient?: SupabaseClient) => {
  if (!supabaseClient) {
    throw new Error("SupabaseClient is required");
  }
  return supabaseClient;
};

export async function createWorkOrder(
  data: Omit<SystemWorkOrder, "id" | "status" | "created_at" | "updated_at" | "contractor_signature_name" | "contractor_signature_data" | "contractor_signed_at" | "finance_signature_name" | "finance_signature_data" | "finance_signed_at">,
  supabaseClient?: SupabaseClient
) {
  const supabase = getClient(supabaseClient);
  
  const { data: result, error } = await supabase
    .from("system_work_orders")
    .insert([{
      ...data,
      status: "PENDING_CONTRACTOR_SIGNATURE" // Move straight to contractor signature
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating work order:", error);
    throw new Error(error.message);
  }
  return result;
}

export async function getAdminWorkOrders(supabaseClient?: SupabaseClient): Promise<SystemWorkOrder[]> {
  const supabase = getClient(supabaseClient);

  const { data, error } = await supabase
    .from("system_work_orders")
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching admin work orders:", error);
    throw new Error(error.message);
  }

  const userIds = Array.from(new Set((data || []).map(row => row.contractor_user_id)));
  let profiles: any[] = [];
  let contractorProfiles: any[] = [];
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    profiles = profilesData || [];

    const { data: cpData } = await supabase
      .from("contractor_profiles")
      .select("user_id, address_line1, address_line2, state_parish")
      .in("user_id", userIds);
    contractorProfiles = cpData || [];
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const cpMap = new Map(contractorProfiles.map(p => [p.user_id, p]));

  return (data || []).map((row: any) => {
    const p = profileMap.get(row.contractor_user_id);
    const cp = cpMap.get(row.contractor_user_id);
    const addressParts = [cp?.address_line1, cp?.address_line2, cp?.state_parish].filter(Boolean);
    
    return {
      ...row,
      contractor_name: p?.full_name,
      contractor_email: p?.email,
      contractor_address: addressParts.length > 0 ? addressParts.join(", ") : undefined
    };
  });
}

export async function getContractorWorkOrders(
  contractorUserId: string,
  supabaseClient?: SupabaseClient
): Promise<SystemWorkOrder[]> {
  const supabase = getClient(supabaseClient);

  const { data, error } = await supabase
    .from("system_work_orders")
    .select('*')
    .eq('contractor_user_id', contractorUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching contractor work orders:", error);
    throw new Error(error.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", contractorUserId)
    .single();

  const { data: cp } = await supabase
    .from("contractor_profiles")
    .select("address_line1, address_line2, state_parish")
    .eq("user_id", contractorUserId)
    .maybeSingle();

  const addressParts = [cp?.address_line1, cp?.address_line2, cp?.state_parish].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(", ") : undefined;

  return (data || []).map(row => ({
    ...row,
    contractor_name: profile?.full_name,
    contractor_email: profile?.email,
    contractor_address: address
  }));
}

export async function getWorkOrderById(
  id: string,
  supabaseClient?: SupabaseClient
): Promise<SystemWorkOrder | null> {
  const supabase = getClient(supabaseClient);

  const { data, error } = await supabase
    .from("system_work_orders")
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error("Error fetching work order:", error);
    throw new Error(error.message);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", data.contractor_user_id)
    .single();

  const { data: cp } = await supabase
    .from("contractor_profiles")
    .select("address_line1, address_line2, state_parish")
    .eq("user_id", data.contractor_user_id)
    .maybeSingle();

  const addressParts = [cp?.address_line1, cp?.address_line2, cp?.state_parish].filter(Boolean);

  return {
    ...data,
    contractor_name: profile?.full_name,
    contractor_email: profile?.email,
    contractor_address: addressParts.length > 0 ? addressParts.join(", ") : undefined
  };
}

export async function signWorkOrderContractor(
  id: string,
  signatureName: string,
  signatureData: string,
  supabaseClient?: SupabaseClient
) {
  const supabase = getClient(supabaseClient);

  const { data, error } = await supabase
    .from("system_work_orders")
    .update({
      contractor_signature_name: signatureName,
      contractor_signature_data: signatureData,
      contractor_signed_at: new Date().toISOString(),
      status: "PENDING_FINANCE_SIGNATURE"
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error signing work order as contractor:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function signWorkOrderFinance(
  id: string,
  signatureName: string,
  signatureData: string,
  supabaseClient?: SupabaseClient
) {
  const supabase = getClient(supabaseClient);

  const { data, error } = await supabase
    .from("system_work_orders")
    .update({
      finance_signature_name: signatureName,
      finance_signature_data: signatureData,
      finance_signed_at: new Date().toISOString(),
      status: "COMPLETED"
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error signing work order as finance:", error);
    throw new Error(error.message);
  }
  return data;
}
