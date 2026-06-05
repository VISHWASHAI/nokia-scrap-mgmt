import { getGraphToken } from './graph.auth.js';
import prisma from '../utils/prisma.js';

export async function uploadToOneDrive(buffer, filename, declarationId = null, triggeredBy = 'MANUAL_DOWNLOAD') {
  const { GRAPH_SHAREPOINT_SITE_ID, GRAPH_DRIVE_ID, GRAPH_FOLDER_PATH } = process.env;

  if (!GRAPH_SHAREPOINT_SITE_ID || !GRAPH_DRIVE_ID) {
    console.warn('[OneDrive] Graph env vars not set — skipping upload, logging FAILED.');
    await prisma.excelExportLog.create({
      data: {
        triggered_by: triggeredBy,
        declaration_id: declarationId,
        filename,
        status: 'FAILED',
        error_message: 'GRAPH_SHAREPOINT_SITE_ID or GRAPH_DRIVE_ID not configured in server/.env',
      },
    });
    return { fileId: null, shareUrl: null, configured: false };
  }

  try {
    const token = await getGraphToken();
    const folder = (GRAPH_FOLDER_PATH || '/Nokia Scrap Reports').replace(/^\//, '');
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${GRAPH_SHAREPOINT_SITE_ID}/drives/${GRAPH_DRIVE_ID}/root:/${folder}/${filename}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const txt = await uploadRes.text();
      throw new Error(`Upload failed: ${txt}`);
    }

    const uploadData = await uploadRes.json();
    const fileId = uploadData.id;

    // Create shareable link
    const linkRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${GRAPH_SHAREPOINT_SITE_ID}/drives/${GRAPH_DRIVE_ID}/items/${fileId}/createLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'view', scope: 'organization' }),
      }
    );

    const linkData = linkRes.ok ? await linkRes.json() : {};
    const shareUrl = linkData?.link?.webUrl ?? null;

    await prisma.excelExportLog.create({
      data: {
        triggered_by: triggeredBy,
        declaration_id: declarationId,
        onedrive_file_id: fileId,
        onedrive_url: shareUrl,
        filename,
        status: 'SUCCESS',
      },
    });

    console.log(`[OneDrive] Uploaded ${filename} → ${shareUrl}`);
    return { fileId, shareUrl };
  } catch (err) {
    console.error('[OneDrive] Upload error:', err.message);
    await prisma.excelExportLog.create({
      data: {
        triggered_by: triggeredBy,
        declaration_id: declarationId,
        filename,
        status: 'FAILED',
        error_message: err.message,
      },
    });
    return { fileId: null, shareUrl: null };
  }
}
