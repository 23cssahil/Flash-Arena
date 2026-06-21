import { redisClient } from '../config/redis';
import User from '../models/User';
import Room from '../models/Room';
import Match from '../models/Match';
import WalletService from './WalletService';
import mongoose from 'mongoose';

const MATCHMAKER_LUA_SCRIPT = `
  local queue_key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local size = redis.call('SCARD', queue_key)
  if size >= capacity then
    local players = redis.call('SPOP', queue_key, capacity)
    return players
  else
    return {}
  end
`;

export interface MatchmakingResult {
  matchCreated: boolean;
  matchId?: string;
  roomId?: string;
  players?: { userId: string; username: string }[];
}

export class Matchmaker {
  private static getQueueKey(entryFee: number): string {
    return `matchmaking:queue:${entryFee}`;
  }

  /**
   * Adds a player to the matchmaking queue for a specific entry fee (stake).
   */
  static async joinQueue(userId: string, entryFee: number, maxPlayers: number = 3): Promise<MatchmakingResult> {
    const queueKey = this.getQueueKey(entryFee);

    const balance = await WalletService.getBalance(userId);
    if (balance < entryFee) {
      throw new Error('Insufficient virtual coins to enter this arena');
    }

    await redisClient.sAdd(queueKey, userId);

    // Evaluate matchmaking queue capacity atomically in Redis
    const poppedPlayers = (await redisClient.eval(MATCHMAKER_LUA_SCRIPT, {
      keys: [queueKey],
      arguments: [maxPlayers.toString()],
    })) as string[];

    if (poppedPlayers && poppedPlayers.length > 0) {
      return await this.createLobby(poppedPlayers, entryFee, maxPlayers);
    }

    return { matchCreated: false };
  }

  /**
   * Removes a player from the matchmaking queue.
   */
  static async leaveQueue(userId: string, entryFee: number): Promise<void> {
    const queueKey = this.getQueueKey(entryFee);
    await redisClient.sRem(queueKey, userId);
  }

  /**
   * Checks if a player is in the queue.
   */
  static async isInQueue(userId: string, entryFee: number): Promise<boolean> {
    const queueKey = this.getQueueKey(entryFee);
    return await redisClient.sIsMember(queueKey, userId);
  }

  /**
   * Helper to create Room and Match documents in MongoDB and debit entry stakes.
   */
  private static async createLobby(
    playerIds: string[],
    entryFee: number,
    maxPlayers: number
  ): Promise<MatchmakingResult> {
    const users = await User.find({ _id: { $in: playerIds } }, 'username');
    const playerDetails = users.map((u) => ({
      userId: u._id as mongoose.Types.ObjectId,
      username: u.username,
      stake: entryFee, // Set initial player stake
      cashedOut: false,
      payout: 0,
    }));

    // Create Room document in MongoDB
    const room = await Room.create({
      name: `Crash Lvl ${entryFee}`,
      entryFee,
      maxPlayers,
      status: 'countdown',
      players: playerIds.map((id) => new mongoose.Types.ObjectId(id)),
    });

    // Calculate Crash Pool Metrics
    const commissionPercent = parseFloat(process.env.DEFAULT_COMMISSION || '10');
    const totalPool = playerIds.length * entryFee;
    const platformFee = (totalPool * commissionPercent) / 100;
    const prizePool = totalPool - platformFee;
    const highestStake = entryFee; // Since all players in the queue have matching stakes

    // Max Safe Multiplier check
    const maxSafeMultiplier = highestStake > 0 ? (prizePool / highestStake) : 1.0;

    // Create Match document in MongoDB
    const match = await Match.create({
      roomId: room._id,
      entryFee,
      commissionPercent,
      platformFee,
      totalPool,
      prizePool,
      remainingPrizePool: prizePool,
      maxSafeMultiplier,
      players: playerDetails,
      status: 'countdown',
      startTime: new Date(),
    });

    // Debit player stakes atomically
    for (const pid of playerIds) {
      try {
        await WalletService.debit(
          pid,
          entryFee,
          'entry_fee',
          `Crash Lobby ${match._id} Stake`,
          match._id
        );
      } catch (err) {
        console.error(`Matchmaker: Failed to debit stake from ${pid}:`, err);
      }
    }

    return {
      matchCreated: true,
      matchId: match._id.toString(),
      roomId: room._id.toString(),
      players: users.map((u) => ({ userId: u._id.toString(), username: u.username })),
    };
  }
}
export default Matchmaker;
