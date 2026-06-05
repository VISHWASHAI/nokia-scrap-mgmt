import cron from 'node-cron';
import dayjs from 'dayjs';
import { generateReport } from '../services/excel.service.js';
import { uploadToOneDrive } from '../services/graph.upload.js';

export function registerNightlyExportJob() {
  cron.schedule('55 23 * * *', async () => {
    console.log('[Cron] Nightly export starting…');
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const buffer = await generateReport(today, today);
      const filename = `Nokia_Scrap_Report_${dayjs().format('YYYYMMDD')}_nightly.xlsx`;
      const result = await uploadToOneDrive(buffer, filename, null, 'CRON_NIGHTLY');
      console.log('[Cron] Nightly export complete:', result.shareUrl ?? 'no URL');
    } catch (err) {
      console.error('[Cron] Nightly export failed:', err.message);
    }
  });

  console.log('[Cron] Nightly export job registered (23:55 daily)');
}
