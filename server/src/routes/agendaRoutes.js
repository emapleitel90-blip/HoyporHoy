import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAgenda, getAgendaOptions, createAgendaTask, updateAgendaTask } from '../controllers/agendaController.js';

const router = express.Router();
router.use(protect);
router.get('/', getAgenda);
router.get('/options', getAgendaOptions);
router.post('/tasks', createAgendaTask);
router.put('/tasks/:id', updateAgendaTask);
export default router;
