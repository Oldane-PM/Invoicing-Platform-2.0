/**
 * Submissions Routes
 *
 * Handles submission creation with invoice PDF generation (Option A: immediate generation)
 */

import { Router, Request, Response } from 'express';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import { getSupabaseAdmin } from '../lib/supabaseServer';
import {
  generateInvoicePdfBuffer,
  generateInvoiceNumber,
  buildInvoiceData,
} from '../services/invoicePdf.service';

const router = Router();

// Configuration from environment
const getConfig = () => ({
  companyName: process.env.COMPANY_NAME || 'TechCorp Inc.',
  companyAddressLine1: process.env.COMPANY_ADDRESS_LINE1 || '789 Business Park, Suite 100',
  companyAddressLine2: process.env.COMPANY_ADDRESS_LINE2 || 'San Francisco, CA 94102',
  hourlyRate: parseFloat(process.env.HOURLY_RATE || '75'),
  overtimeRate: parseFloat(process.env.OVERTIME_RATE || '112.5'),
  invoiceSignedUrlTtl: parseInt(process.env.INVOICE_SIGNED_URL_TTL_SECONDS || '300', 10),
});

/**
 * POST /api/submissions
 *
 * Create a new submission and generate invoice PDF immediately
 */
router.post('/', requireSupabaseAuth, async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;
  const userEmail = req.user!.email;
  const config = getConfig();

  console.log(`[submissions] Creating submission for user: ${userId}`);

  try {
    const {
      organization_id,
      contract_id,
      period_start,
      period_end,
      project_name,
      regular_hours,
      overtime_hours,
      description,
      overtime_description,
      total_amount,
    } = req.body;

    // Validate required fields
    if (!organization_id || !period_start || !period_end) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required fields: organization_id, period_start, period_end',
      });
      return;
    }

    // Extract work period (YYYY-MM) from period_start
    const workPeriod = period_start.substring(0, 7);

    // 1. Create submission with invoice_status = 'PENDING'
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        organization_id,
        contractor_user_id: userId,
        contract_id: contract_id || null,
        period_start,
        period_end,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        invoice_status: 'PENDING',
        project_name: project_name || 'General Work',
        regular_hours: regular_hours || 0,
        overtime_hours: overtime_hours || 0,
        description: description || '',
        overtime_description: overtime_description || null,
        total_amount: total_amount || 0,
      })
      .select()
      .single();

    if (insertError || !submission) {
      console.error('[submissions] Insert error:', insertError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to create submission',
        details: insertError?.message,
      });
      return;
    }

    console.log(`[submissions] Created submission: ${submission.id}`);

    // 2. Generate invoice number with retry logic for uniqueness
    let invoiceNumber: string = '';
    let invoiceGenerated = false;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries && !invoiceGenerated; attempt++) {
      try {
        // Count existing invoices for this month
        const { count, error: countError } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .like('invoice_number', `INV-${workPeriod.replace('-', '')}%`);

        if (countError) {
          console.error('[submissions] Count error:', countError);
        }

        invoiceNumber = generateInvoiceNumber(workPeriod, count || 0, attempt);

        // Check if number already exists
        const { data: existing } = await supabase
          .from('submissions')
          .select('id')
          .eq('invoice_number', invoiceNumber)
          .single();

        if (!existing) {
          invoiceGenerated = true;
        }
      } catch {
        // Continue to next attempt
      }
    }

    if (!invoiceNumber) {
      invoiceNumber = `INV-${workPeriod.replace('-', '')}-${Date.now()}`;
    }

    // 3. Fetch contractor profile for invoice (optional enhancement)
    let contractorName = userEmail.split('@')[0];
    let contractorAddress = '';

    const { data: appUser } = await supabase
      .from('app_users')
      .select('first_name, last_name, email')
      .eq('auth_user_id', userId)
      .single();

    if (appUser) {
      contractorName = `${appUser.first_name || ''} ${appUser.last_name || ''}`.trim() || contractorName;
    }

    // 4. Generate PDF buffer
    let pdfBuffer: Buffer;
    try {
      const invoiceData = buildInvoiceData(
        {
          id: submission.id,
          work_period: workPeriod,
          project_name: submission.project_name,
          regular_hours: submission.regular_hours,
          overtime_hours: submission.overtime_hours,
          description: submission.description,
          overtime_description: submission.overtime_description,
          total_amount: submission.total_amount,
          contractor_name: contractorName,
          contractor_email: userEmail,
          contractor_address: contractorAddress || undefined,
        },
        config,
        invoiceNumber
      );

      pdfBuffer = await generateInvoicePdfBuffer(invoiceData);
      console.log(`[submissions] Generated PDF: ${pdfBuffer.length} bytes`);
    } catch (pdfError) {
      console.error('[submissions] PDF generation error:', pdfError);

      // Update submission with failure status
      await supabase
        .from('submissions')
        .update({
          invoice_status: 'FAILED',
          invoice_error: pdfError instanceof Error ? pdfError.message : 'PDF generation failed',
        })
        .eq('id', submission.id);

      res.status(500).json({
        status: 'error',
        message: 'Failed to generate invoice PDF',
        submission: {
          id: submission.id,
          invoice_status: 'FAILED',
        },
      });
      return;
    }

    // 5. Upload to Supabase Storage
    const invoicePath = `${userId}/${workPeriod}/${invoiceNumber}.pdf`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(invoicePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      console.log(`[submissions] Uploaded PDF to: ${invoicePath}`);
    } catch (uploadError) {
      console.error('[submissions] Upload error:', uploadError);

      // Update submission with failure status
      await supabase
        .from('submissions')
        .update({
          invoice_status: 'FAILED',
          invoice_error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
        })
        .eq('id', submission.id);

      res.status(500).json({
        status: 'error',
        message: 'Failed to upload invoice PDF',
        submission: {
          id: submission.id,
          invoice_status: 'FAILED',
        },
      });
      return;
    }

    // 6. Update submission with invoice details
    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        invoice_number: invoiceNumber,
        invoice_status: 'GENERATED',
        invoice_path: invoicePath,
        invoice_generated_at: new Date().toISOString(),
        invoice_error: null,
      })
      .eq('id', submission.id)
      .select()
      .single();

    if (updateError) {
      console.error('[submissions] Update error:', updateError);
    }

    console.log(`[submissions] Invoice generated successfully: ${invoiceNumber}`);

    // 7. Return created submission
    res.status(201).json({
      status: 'success',
      data: {
        id: updatedSubmission?.id || submission.id,
        contractor_user_id: userId,
        period_start,
        period_end,
        status: 'submitted',
        invoice_number: invoiceNumber,
        invoice_status: 'GENERATED',
        invoice_path: invoicePath,
        project_name: submission.project_name,
        regular_hours: submission.regular_hours,
        overtime_hours: submission.overtime_hours,
        total_amount: submission.total_amount,
        description: submission.description,
        submitted_at: submission.submitted_at,
      },
    });
  } catch (error) {
    console.error('[submissions] Unexpected error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/submissions
 *
 * List all submissions for the authenticated contractor
 */
router.get('/', requireSupabaseAuth, async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;

  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        id,
        organization_id,
        contractor_user_id,
        contract_id,
        period_start,
        period_end,
        status,
        submitted_at,
        created_at,
        invoice_number,
        invoice_status,
        invoice_path,
        invoice_generated_at,
        project_name,
        regular_hours,
        overtime_hours,
        total_amount,
        description,
        overtime_description
      `)
      .eq('contractor_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[submissions] List error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch submissions',
      });
      return;
    }

    res.json({
      status: 'success',
      data: submissions || [],
    });
  } catch (error) {
    console.error('[submissions] List exception:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/submissions/:id
 *
 * Get a single submission by ID (with ownership check)
 */
router.get('/:id', requireSupabaseAuth, async (req: Request, res: Response): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const userId = req.user!.id;
  const submissionId = req.params.id;

  try {
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error || !submission) {
      res.status(404).json({
        status: 'error',
        message: 'Submission not found',
      });
      return;
    }

    // Enforce ownership
    if (submission.contractor_user_id !== userId) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    res.json({
      status: 'success',
      data: submission,
    });
  } catch (error) {
    console.error('[submissions] Get error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
