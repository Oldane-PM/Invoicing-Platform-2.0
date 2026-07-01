import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../clients/supabase.server';

async function verifyAdminOrManager(req: Request, res: Response): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseAdmin();
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', userData.user.email)
    .single();

  if (!profile || !['admin', 'manager'].includes(profile.role.toLowerCase())) {
    res.status(403).json({ error: 'Forbidden: Admin or Manager role required' });
    return false;
  }
  return true;
}

// RULES CRUD
export async function getRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentType } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('admin_verification_rules')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[adminConfig.controller] Error fetching rules:', error);
    next(error);
  }
}

export async function upsertRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const body = req.body;
    const supabase = getSupabaseAdmin();

    const ruleRecord = {
      document_type: body.document_type,
      rule_name: body.rule_name,
      rule_description: body.rule_description,
      rule_type: body.rule_type,
      weight: Number(body.weight || 0),
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (body.id) {
      result = await supabase
        .from('admin_verification_rules')
        .update(ruleRecord)
        .eq('id', body.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('admin_verification_rules')
        .insert(ruleRecord)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('[adminConfig.controller] Error upserting rule:', error);
    next(error);
  }
}

export async function deleteRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('admin_verification_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('[adminConfig.controller] Error deleting rule:', error);
    next(error);
  }
}

// SAMPLES CRUD
export async function getSamples(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentType } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('admin_reference_samples')
      .select('*')
      .eq('document_type', documentType)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Allow empty result
    res.status(200).json({ success: true, data: data || null });
  } catch (error) {
    console.error('[adminConfig.controller] Error fetching samples:', error);
    next(error);
  }
}

export async function upsertSample(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const body = req.body;
    const supabase = getSupabaseAdmin();

    const sampleRecord = {
      document_type: body.document_type,
      sample_pdf_url: body.sample_pdf_url,
      reference_image_urls: body.reference_image_urls || [],
      instruction_doc_link: body.instruction_doc_link,
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString()
    };

    let result;
    const { data: existing } = await supabase
      .from('admin_reference_samples')
      .select('id')
      .eq('document_type', body.document_type)
      .single();

    if (existing) {
      result = await supabase
        .from('admin_reference_samples')
        .update(sampleRecord)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('admin_reference_samples')
        .insert(sampleRecord)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('[adminConfig.controller] Error upserting sample:', error);
    next(error);
  }
}

// EXTRACTION FIELDS CRUD
export async function getFields(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { documentType } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('admin_extraction_fields')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[adminConfig.controller] Error fetching fields:', error);
    next(error);
  }
}

export async function upsertField(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const body = req.body;
    const supabase = getSupabaseAdmin();

    const fieldRecord = {
      document_type: body.document_type,
      field_name: body.field_name,
      field_description: body.field_description,
      field_format: body.field_format,
      mapping_key: body.mapping_key,
      is_required: body.is_required !== false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (body.id) {
      result = await supabase
        .from('admin_extraction_fields')
        .update(fieldRecord)
        .eq('id', body.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('admin_extraction_fields')
        .insert(fieldRecord)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.status(200).json({ success: true, data: result.data });
  } catch (error) {
    console.error('[adminConfig.controller] Error upserting field:', error);
    next(error);
  }
}

export async function deleteField(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const { id } = req.params;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('admin_extraction_fields')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Field deleted successfully' });
  } catch (error) {
    console.error('[adminConfig.controller] Error deleting field:', error);
    next(error);
  }
}

// LOGS VIEWS
export async function getFindings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const { documentType } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('document_validation_findings')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[adminConfig.controller] Error fetching findings logs:', error);
    next(error);
  }
}

export async function getExtractedData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!(await verifyAdminOrManager(req, res))) return;
    const { documentType } = req.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('document_extracted_data')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[adminConfig.controller] Error fetching extracted data logs:', error);
    next(error);
  }
}
