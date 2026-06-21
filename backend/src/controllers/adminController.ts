import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Match from '../models/Match';
import AdminLog from '../models/AdminLog';
import { redisClient } from '../config/redis';

export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    // 1. User Count
    const totalUsers = await User.countDocuments();

    // 2. Wallet/Coin circulation
    const walletStats = await Wallet.aggregate([
      { $group: { _id: null, totalCoins: { $sum: '$balance' } } }
    ]);
    const coinsInCirculation = walletStats.length > 0 ? walletStats[0].totalCoins : 0;

    // 3. Match Analytics
    const totalMatches = await Match.countDocuments();
    const activeMatchesCount = await Match.countDocuments({ status: { $in: ['countdown', 'playing'] } });
    
    // 4. Revenue Analytics (Platform Commissions)
    const revenueStats = await Match.aggregate([
      { $match: { status: 'completed' } },
      { 
        $group: { 
          _id: null, 
          totalCommission: { $sum: '$platformCommission' },
          totalVolume: { $sum: '$totalPool' }
        } 
      }
    ]);
    const totalCommissionEarned = revenueStats.length > 0 ? revenueStats[0].totalCommission : 0;
    const totalVolumeTraded = revenueStats.length > 0 ? revenueStats[0].totalVolume : 0;

    // 5. Active Match list for display
    const activeMatches = await Match.find({ status: { $in: ['countdown', 'playing'] } })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      totalUsers,
      coinsInCirculation,
      totalMatches,
      activeMatchesCount,
      totalCommissionEarned,
      totalVolumeTraded,
      activeMatches,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}, '-passwordHash -refreshToken')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Get admin users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const adminId = req.user?.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot deactivate an administrator' });
    }

    // Toggle active state
    user.isActive = !user.isActive;
    await user.save();

    // Log the audit event
    await AdminLog.create({
      adminId,
      action: user.isActive ? 'unban_user' : 'ban_user',
      details: { targetUserId: userId, username: user.username },
      ipAddress: req.ip,
    });

    // Revoke refresh token if banned
    if (!user.isActive) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
    }

    return res.status(200).json({
      message: `User status changed to ${user.isActive ? 'active' : 'inactive'}`,
      user: { id: user._id, username: user.username, isActive: user.isActive },
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCommissionConfig = async (req: AuthRequest, res: Response) => {
  try {
    const customCommission = await redisClient.get('config:commission');
    const commission = customCommission !== null
      ? parseFloat(customCommission)
      : parseFloat(process.env.DEFAULT_COMMISSION || '10');

    return res.status(200).json({ commission });
  } catch (error) {
    console.error('Get commission config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const setCommissionConfig = async (req: AuthRequest, res: Response) => {
  const { commission } = req.body;
  const adminId = req.user?.userId;

  if (typeof commission !== 'number' || commission < 0 || commission > 100) {
    return res.status(400).json({ error: 'Commission must be a percentage between 0 and 100.' });
  }

  try {
    // Save to Redis for runtime override
    await redisClient.set('config:commission', commission.toString());

    // Audit log
    await AdminLog.create({
      adminId,
      action: 'change_commission',
      details: { newCommission: commission },
      ipAddress: req.ip,
    });

    return res.status(200).json({ message: 'Commission configuration updated successfully', commission });
  } catch (error) {
    console.error('Set commission config error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AdminLog.find({})
      .populate('adminId', 'username email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
