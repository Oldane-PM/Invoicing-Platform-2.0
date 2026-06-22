import { getSupabaseAdmin } from '../clients/supabase.server';
import { auth } from '../../src/lib/auth';
import { extractDetailsFromFile } from '../services/workOrderExtractor';
const WORK_ORDERS_BUCKET = 'work-orders';
/**
 * Express handler to extract details from an uploaded work order document.
 */
export async function extractWorkOrderHandler(req, res) {
    try {
        let userId = null;
        let userEmail = null;
        // 1. Authenticate user: First try Supabase Auth token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const supabase = getSupabaseAdmin();
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) {
                userEmail = user.email || null;
                userId = user.id;
            }
        }
        // Fallback to Better Auth session
        if (!userId) {
            const session = await auth.api.getSession({
                headers: req.headers,
            });
            if (session?.user) {
                userEmail = session.user.email || null;
                userId = session.user.id;
            }
        }
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const { storagePath } = req.body;
        if (!storagePath) {
            res.status(400).json({ error: 'Missing storagePath in request body' });
            return;
        }
        // Ensure the user is only accessing their own work order directory in storage
        // The path format is `{userId}/{timestamp}-{filename}`.
        const pathParts = storagePath.split('/');
        const pathUserId = pathParts[0];
        // Get contractor's profile UUID from email to verify access if pathUserId doesn't match directly
        const supabase = getSupabaseAdmin();
        let profileId = userId;
        if (userEmail) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', userEmail)
                .single();
            if (profile) {
                profileId = profile.id;
            }
        }
        // If the path userId matches neither the auth userId nor the profile UUID, deny access
        if (pathUserId !== userId && pathUserId !== profileId) {
            // Allow admins to extract any work order
            let isAdmin = false;
            if (userEmail) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('email', userEmail)
                    .single();
                if (profile?.role?.toLowerCase() === 'admin') {
                    isAdmin = true;
                }
            }
            if (!isAdmin) {
                res.status(403).json({ error: 'Forbidden: You do not have permission to access this document.' });
                return;
            }
        }
        // 2. Fetch original file metadata from the vendor_work_orders audit log (optional fallback)
        const { data: auditData } = await supabase
            .from('vendor_work_orders')
            .select('file_name, content_type')
            .eq('storage_path', storagePath)
            .maybeSingle();
        const fileName = auditData?.file_name || storagePath.split('/').pop() || 'work_order';
        const contentType = auditData?.content_type || getMimeTypeFromFileName(fileName);
        console.log(`[workOrder.controller] Processing extraction for file: ${fileName} (${contentType})`);
        // 3. Download the file from Supabase storage
        const { data: fileBlob, error: downloadError } = await supabase.storage
            .from(WORK_ORDERS_BUCKET)
            .download(storagePath);
        if (downloadError || !fileBlob) {
            console.error('[workOrder.controller] Supabase storage download failed:', downloadError);
            res.status(404).json({ error: 'Uploaded work order document not found in storage.' });
            return;
        }
        // 4. Convert Blob to Buffer
        const arrayBuffer = await fileBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // 5. Run extraction
        const extractedData = await extractDetailsFromFile(buffer, contentType, fileName);
        res.status(200).json({
            success: true,
            data: extractedData,
        });
    }
    catch (err) {
        console.error('[workOrder.controller] Extraction endpoint failed:', err);
        res.status(500).json({
            error: err instanceof Error ? err.message : 'An unknown error occurred during extraction.',
        });
    }
}
/**
 * Helper to guess mime type from file extension
 */
function getMimeTypeFromFileName(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return 'application/pdf';
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'webp':
            return 'image/webp';
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'doc':
            return 'application/msword';
        default:
            return 'application/octet-stream';
    }
}
