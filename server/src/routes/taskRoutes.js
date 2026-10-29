import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createTask, getCaseTasks, getTask, getMyTasks, getReviewTasks, transitionTask } from '../controllers/taskController.js';

const router = express.Router();
router.use(protect);
router.get('/my-tasks', getMyTasks);
router.get('/to-review', getReviewTasks);
router.route('/case/:caseId').get(getCaseTasks).post(createTask);
router.get('/:id', getTask);
router.put('/:id/start', transitionTask('start'));
router.put('/:id/progress', transitionTask('progress'));
router.put('/:id/submit', transitionTask('submit'));
router.put('/:id/review', transitionTask('review'));
export default router;
