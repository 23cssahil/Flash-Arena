import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import WalletService from '../services/WalletService';
import Transaction from '../models/Transaction';
import { redisClient } from '../config/redis';

export const getBalance = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const balance = await WalletService.getBalance(userId);
    return res.status(200).json({ balance });
  } catch (error) {
    console.error('Get balance error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const claimFaucet = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const lockKey = `faucet:lock:${userId}`;
  const claimAmount = 500;

  try {
    // Check if user has claimed within 24 hours
    const isLocked = await redisClient.get(lockKey);
    if (isLocked) {
      return res.status(429).json({
        error: 'Faucet rate-limited',
        message: 'You can only claim free virtual coins once every 24 hours.',
      });
    }

    // Process credit
    await WalletService.credit(
      userId,
      claimAmount,
      'faucet',
      'Claimed 500 daily coins from faucet'
    );

    // Set 24 hour lock (86400 seconds)
    await redisClient.set(lockKey, 'claimed', { EX: 86400 });

    return res.status(200).json({
      message: `Success! ${claimAmount} virtual coins credited to your wallet.`,
      claimedAmount: claimAmount,
    });
  } catch (error) {
    console.error('Faucet claim error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
