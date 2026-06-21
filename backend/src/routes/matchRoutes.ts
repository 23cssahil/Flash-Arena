import { Router } from 'express';
import { getHistory, getLeaderboard, getMatchDetails } from '../controllers/matchController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware
router.use(authenticate);

router.get('/history', getHistory);
router.get('/leaderboard', getLeaderboard);
router.get('/:matchId', getMatchDetails);

export default router;
