import { Router } from 'express';
import { getBalance, claimFaucet, getTransactions } from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all wallet actions
router.use(authenticate);

router.get('/balance', getBalance);
router.post('/faucet', claimFaucet);
router.get('/transactions', getTransactions);

export default router;
