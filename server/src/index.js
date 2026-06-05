import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import declarationRoutes from './routes/declaration.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import vendorPickupRoutes from './routes/vendorPickup.routes.js';
import liveRoutes from './routes/live.routes.js';
import adminExcelRoutes from './routes/adminExcel.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerNightlyExportJob } from './jobs/nightlyExport.job.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
}));

app.use(express.json({ limit: '5mb' }));

// Power Query setup page (unauthenticated)
app.get('/powerquery-setup', (req, res) => {
  res.sendFile(join(__dirname, 'powerquery-setup.html'));
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/declarations', declarationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/vendor-pickups', vendorPickupRoutes);
app.use('/api/v1/live', liveRoutes);
app.use('/api/v1/admin/excel', adminExcelRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found', code: 'NOT_FOUND' } });
});

// Global error handler
app.use(errorHandler);

// Start
app.listen(PORT, () => {
  console.log(`[Server] Nokia Scrap API running on port ${PORT}`);
  registerNightlyExportJob();
});

export default app;
