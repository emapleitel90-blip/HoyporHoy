import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import deadlineRoutes from './routes/deadlineRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import jurisprudenceRoutes from './routes/jurisprudenceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import optimizerRoutes from './routes/optimizerRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import formConfigRoutes from './routes/formConfigRoutes.js';

import { errorHandler } from './middleware/errorMiddleware.js';
import { checkUpcomingDeadlines } from './skills/deadlineAgent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/jurisprudencia', jurisprudenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/optimizer', optimizerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/form-config', formConfigRoutes);

app.get('/', (req, res) => {
    res.send('LyP API is running');
});

// ── Global Error Handler (MUST be last) ─────────────────────────────────────
app.use(errorHandler);

// ── Cron Jobs ────────────────────────────────────────────────────────────────
// Agente de Vencimientos: todos los días a las 7:00 AM
cron.schedule('0 7 * * *', () => {
    console.log('[CRON] Ejecutando Agente de Vencimientos...');
    checkUpcomingDeadlines().catch(err =>
        console.error('[CRON] Error en Agente de Vencimientos:', err.message)
    );
}, { timezone: 'America/Argentina/Cordoba' });

// Auditorías requeridas por la Ley fueron removidas a pedido del usuario.

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
