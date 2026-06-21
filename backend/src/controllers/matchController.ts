import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Match from '../models/Match';
import Leaderboard from '../models/Leaderboard';

export const getHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const history = await Match.find({ 'players.userId': userId })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.status(200).json({ history });
  } catch (err) {
    console.error('Get history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const leaders = await Leaderboard.find({})
      .sort({ totalEarned: -1 })
      .limit(100);
    return res.status(200).json({ leaders });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMatchDetails = async (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    const isParticipant = match.players.some(p => p.userId.toString() === userId);
    if (!isParticipant) return res.status(403).json({ error: 'Forbidden.' });
    return res.status(200).json({ match });
  } catch (err) {
    console.error('Get match details error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
