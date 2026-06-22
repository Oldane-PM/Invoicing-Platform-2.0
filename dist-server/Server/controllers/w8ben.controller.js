import { getSupabaseAdmin } from '../clients/supabase.server';
import { generateW8BenPdf } from '../services/documents/generateW8BenPdf';
import { auth } from '../../src/lib/auth';
const W8BEN_BUCKET = process.env.SUPABASE_INVOICES_BUCKET || 'invoices'; // Reusing invoices bucket for now
async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data } = await getSupabaseAdmin().auth.getUser(token);
        if (data.user)
            return data.user;
    }
    // Fallback to better-auth
    const session = await auth.api.getSession({
        headers: req.headers,
    });
    return session?.user || null;
}
export async function submitW8BenForm(req, res, next) {
    try {
        const user = await getUserFromRequest(req);
        if (!user?.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const contractorId = user.id;
        const body = req.body;
        // Validate minimum required fields
        if (!body.name || !body.citizenship || !body.residenceAddress || !body.signatureName) {
            res.status(400).json({ error: 'Missing required W-8BEN fields' });
            return;
        }
        const supabase = getSupabaseAdmin();
        // Check if there's an existing form that was returned for review
        const { data: existingForm } = await supabase
            .from('w8ben_forms')
            .select('id, status')
            .eq('contractor_user_id', contractorId)
            .single();
        // If a form already exists and is NOT returned, block re-submission
        if (existingForm && existingForm.status !== 'returned') {
            res.status(409).json({ error: 'A W-8BEN form has already been submitted. It cannot be resubmitted unless returned for review.' });
            return;
        }
        // Generate PDF
        const pdfData = {
            name: body.name,
            citizenship: body.citizenship,
            residenceAddress: body.residenceAddress,
            residenceCity: body.residenceCity,
            residenceCountry: body.residenceCountry,
            mailingAddress: body.mailingAddress,
            mailingCity: body.mailingCity,
            mailingCountry: body.mailingCountry,
            usTaxId: body.usTaxId,
            foreignTaxId: body.foreignTaxId,
            referenceNumber: body.referenceNumber,
            dob: body.dob,
            treatyCountry: body.treatyCountry,
            specialRatesArticle: body.specialRatesArticle,
            specialRatesPercent: body.specialRatesPercent,
            specialRatesIncomeType: body.specialRatesIncomeType,
            specialRatesConditions: body.specialRatesConditions,
            signatureName: body.signatureName,
            signatureDate: new Date(),
            ipAddress: req.ip || req.socket.remoteAddress,
        };
        const pdfBuffer = await generateW8BenPdf(pdfData);
        // Upload PDF
        const timestamp = Date.now();
        const storagePath = `tax-forms/${contractorId}/w8ben-${timestamp}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(W8BEN_BUCKET)
            .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
        });
        if (uploadError) {
            console.error('[w8ben.controller] PDF Upload failed:', uploadError);
            res.status(500).json({ error: 'Failed to upload W-8BEN PDF' });
            return;
        }
        const formRecord = {
            contractor_user_id: contractorId,
            form_data: body,
            signature_data: {
                name: pdfData.signatureName,
                date: pdfData.signatureDate.toISOString(),
                ip: pdfData.ipAddress,
            },
            pdf_url: uploadData.path,
            status: 'submitted',
            updated_at: new Date().toISOString(),
        };
        let dbData;
        let dbError;
        if (existingForm) {
            // Update the existing returned form
            const result = await supabase
                .from('w8ben_forms')
                .update(formRecord)
                .eq('id', existingForm.id)
                .select()
                .single();
            dbData = result.data;
            dbError = result.error;
        }
        else {
            // Insert new form
            const result = await supabase
                .from('w8ben_forms')
                .insert(formRecord)
                .select()
                .single();
            dbData = result.data;
            dbError = result.error;
        }
        if (dbError) {
            console.error('[w8ben.controller] DB Save failed:', dbError);
            res.status(500).json({ error: 'Failed to save W-8BEN form record' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'W-8BEN form submitted successfully',
            data: dbData,
        });
    }
    catch (error) {
        console.error('[w8ben.controller] Error submitting W-8BEN:', error);
        next(error);
    }
}
export async function getW8BenForm(req, res, next) {
    try {
        const user = await getUserFromRequest(req);
        if (!user?.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { contractorId } = req.params;
        const supabase = getSupabaseAdmin();
        const { data: form, error } = await supabase
            .from('w8ben_forms')
            .select('*')
            .eq('contractor_user_id', contractorId)
            .single();
        if (error || !form) {
            res.status(404).json({ error: 'W-8BEN form not found' });
            return;
        }
        let signedUrl = null;
        if (form.pdf_url) {
            const { data: urlData, error: urlError } = await supabase.storage
                .from(W8BEN_BUCKET)
                .createSignedUrl(form.pdf_url, 3600); // 1 hour expiry
            if (!urlError && urlData) {
                signedUrl = urlData.signedUrl;
            }
        }
        res.status(200).json({
            success: true,
            data: {
                ...form,
                signed_pdf_url: signedUrl,
            },
        });
    }
    catch (error) {
        console.error('[w8ben.controller] Error fetching W-8BEN:', error);
        next(error);
    }
}
/**
 * Return a W-8BEN form for review (admin/manager only).
 * Changes the status to 'returned' so the contractor can edit and resubmit.
 */
export async function returnW8BenForm(req, res, next) {
    try {
        const user = await getUserFromRequest(req);
        if (!user?.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { contractorId } = req.params;
        const { reason } = req.body;
        const supabase = getSupabaseAdmin();
        // Verify the caller is an admin or manager
        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('email', user.email)
            .single();
        if (!callerProfile || !['admin', 'manager'].includes(callerProfile.role.toLowerCase())) {
            res.status(403).json({ error: 'Only admins and managers can return forms for review' });
            return;
        }
        // Update the form status to 'returned'
        const { data: updatedForm, error } = await supabase
            .from('w8ben_forms')
            .update({
            status: 'returned',
            updated_at: new Date().toISOString(),
        })
            .eq('contractor_user_id', contractorId)
            .select()
            .single();
        if (error) {
            console.error('[w8ben.controller] Return failed:', error);
            res.status(500).json({ error: 'Failed to return W-8BEN form' });
            return;
        }
        // If a reason was provided, store it separately by updating form_data
        if (reason && updatedForm) {
            const existingFormData = updatedForm.form_data || {};
            await supabase
                .from('w8ben_forms')
                .update({
                form_data: { ...existingFormData, _return_reason: reason },
            })
                .eq('contractor_user_id', contractorId);
        }
        res.status(200).json({
            success: true,
            message: 'W-8BEN form returned for review',
            data: updatedForm,
        });
    }
    catch (error) {
        console.error('[w8ben.controller] Error returning W-8BEN:', error);
        next(error);
    }
}
/**
 * Handle direct upload of a W-8BEN PDF form
 */
export async function uploadW8BenForm(req, res, next) {
    try {
        const user = await getUserFromRequest(req);
        if (!user?.id) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const contractorId = user.id;
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        if (file.mimetype !== 'application/pdf') {
            res.status(400).json({ error: 'Only PDF files are allowed' });
            return;
        }
        const supabase = getSupabaseAdmin();
        // Check if there's an existing form that was returned for review
        const { data: existingForm } = await supabase
            .from('w8ben_forms')
            .select('id, status')
            .eq('contractor_user_id', contractorId)
            .single();
        // If a form already exists and is NOT returned, block re-submission
        if (existingForm && existingForm.status !== 'returned') {
            res.status(409).json({ error: 'A W-8BEN form has already been submitted. It cannot be resubmitted unless returned for review.' });
            return;
        }
        // Upload PDF
        const timestamp = Date.now();
        const storagePath = `tax-forms/${contractorId}/w8ben-uploaded-${timestamp}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(W8BEN_BUCKET)
            .upload(storagePath, file.buffer, {
            contentType: 'application/pdf',
            upsert: true,
        });
        if (uploadError) {
            console.error('[w8ben.controller] PDF Upload failed:', uploadError);
            res.status(500).json({ error: 'Failed to upload W-8BEN PDF' });
            return;
        }
        const formRecord = {
            contractor_user_id: contractorId,
            form_data: {}, // Empty since it's a direct upload
            signature_data: {}, // Empty since signature is in the uploaded PDF
            pdf_url: uploadData.path,
            status: 'submitted',
            updated_at: new Date().toISOString(),
        };
        let dbData;
        let dbError;
        if (existingForm) {
            // Update the existing returned form
            const result = await supabase
                .from('w8ben_forms')
                .update(formRecord)
                .eq('id', existingForm.id)
                .select()
                .single();
            dbData = result.data;
            dbError = result.error;
        }
        else {
            // Insert new form
            const result = await supabase
                .from('w8ben_forms')
                .insert(formRecord)
                .select()
                .single();
            dbData = result.data;
            dbError = result.error;
        }
        if (dbError) {
            console.error('[w8ben.controller] DB Save failed:', dbError);
            res.status(500).json({ error: 'Failed to save W-8BEN form record' });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'W-8BEN form uploaded successfully',
            data: dbData,
        });
    }
    catch (error) {
        console.error('[w8ben.controller] Error uploading W-8BEN:', error);
        next(error);
    }
}
