import { Router } from 'express';
import { 
  getStats, 
  getUsers, 
  toggleUserStatus, 
  getCommissionConfig, 
  setCommissionConfig, 
  getAuditLogs 
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Secure admin actions under both authentication and role guards
router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.post('/users/:userId/ban', toggleUserStatus);
router.get('/commission', getCommissionConfig);
router.post('/commission', setCommissionConfig);
router.get('/logs', getAuditLogs);

export default router;
