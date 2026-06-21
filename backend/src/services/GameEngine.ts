import { Server } from 'socket.io';
import { redisClient } from '../config/redis';
import Match from '../models/Match';
import WalletService from './WalletService';
import { GAME_CONSTANTS } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

export class GameEngine {
  private static ioServer: Server;

  /**
   * Initializes the socket server instance in the engine.
   */
  static init(io: Server) {
    this.ioServer = io;
  }

  /**
   * Starts the countdown phase for a match.
   */
  static async startMatchLifecycle(matchId: string, roomId: string) {
    console.log(`🚀 Starting countdown lifecycle for match: ${matchId}`);
    let countdown = GAME_CONSTANTS.COUNTDOWN_DURATION;

    // Emit initial countdown event
    this.ioServer.to(roomId).emit('countdown_update', { countdown });

    const interval = setInterval(async () => {
      countdown--;
      this.ioServer.to(roomId).emit('countdown_update', { countdown });

      if (countdown <= 0) {
        clearInterval(interval);
        await this.startGameplay(matchId, roomId);
      }
    }, 1000);
  }

  /**
   * Starts the active gameplay phase (target spawning loop).
   */
  private static async startGameplay(matchId: string, roomId: string) {
    console.log(`🎮 Match ${matchId} is now LIVE.`);
    
    // Update match state in database
    await Match.findByIdAndUpdate(matchId, { 
      status: 'playing',
      startTime: new Date() 
    });

    this.ioServer.to(roomId).emit('game_start', {
      duration: GAME_CONSTANTS.GAME_DURATION,
    });

    // Start target spawning loop
    let elapsed = 0;
    const spawnTimer = setInterval(async () => {
      elapsed += GAME_CONSTANTS.TARGET_SPAWN_INTERVAL;

      if (elapsed >= GAME_CONSTANTS.GAME_DURATION) {
        clearInterval(spawnTimer);
        await this.endMatch(matchId, roomId);
      } else {
        await this.spawnTarget(matchId, roomId);
      }
    }, GAME_CONSTANTS.TARGET_SPAWN_INTERVAL * 1000);

    // Spawn the first target immediately
    await this.spawnTarget(matchId, roomId);
  }

  /**
   * Spawns a new target, logs it in Redis, and broadcasts it to all players.
   */
  private static async spawnTarget(matchId: string, roomId: string) {
    const targetId = uuidv4();
    const x = Math.floor(
      Math.random() * (GAME_CONSTANTS.MAX_COORD - GAME_CONSTANTS.MIN_COORD + 1) + 
      GAME_CONSTANTS.MIN_COORD
    );
    const y = Math.floor(
      Math.random() * (GAME_CONSTANTS.MAX_COORD - GAME_CONSTANTS.MIN_COORD + 1) + 
      GAME_CONSTANTS.MIN_COORD
    );
    const spawnTime = new Date().toISOString();

    // Store target info in Redis for validation (expires in 5 seconds to clean up)
    const redisKey = `match:${matchId}:target:${targetId}`;
    await redisClient.hSet(redisKey, {
      id: targetId,
      x: x.toString(),
      y: y.toString(),
      spawnTime,
    });
    await redisClient.expire(redisKey, 5);

    // Broadcast target to all players in the room
    this.ioServer.to(roomId).emit('target_spawn', {
      id: targetId,
      x,
      y,
      spawnTime,
    });

    // Update match document targets array for audit logs
    await Match.findByIdAndUpdate(matchId, {
      $push: {
        targets: { id: targetId, x, y, spawnTime: new Date(spawnTime) }
      }
    });
  }

  /**
   * Validates target clicks using Redis (Anti-Cheat & Double Click protection).
   */
  static async validateAndProcessClick(
    matchId: string,
    userId: string,
    targetId: string,
    clientClickTime: string
  ): Promise<{ valid: boolean; scoreDelta: number; newScore: number }> {
    const targetKey = `match:${matchId}:target:${targetId}`;
    const claimKey = `match:${matchId}:claims:${userId}`;

    // 1. Check if user already claimed this target (Double Click protection)
    const alreadyClaimed = await redisClient.sIsMember(claimKey, targetId);
    if (alreadyClaimed) {
      return { valid: false, scoreDelta: 0, newScore: 0 };
    }

    // 2. Fetch target from Redis
    const targetData = await redisClient.hGetAll(targetKey);
    if (!targetData || Object.keys(targetData).length === 0) {
      return { valid: false, scoreDelta: 0, newScore: 0 }; // Target expired or doesn't exist
    }

    const spawnTime = new Date(targetData.spawnTime).getTime();
    const clickTime = new Date(clientClickTime).getTime();
    const responseTime = clickTime - spawnTime;

    // 3. Anti-Cheat: check for inhuman speeds (e.g. bots clicking in < 100ms)
    if (responseTime < GAME_CONSTANTS.MIN_HUMAN_REACTION_MS) {
      console.warn(`⚠️ Anti-Cheat triggered: User ${userId} reacted in ${responseTime}ms`);
      return { valid: false, scoreDelta: 0, newScore: 0 };
    }

    // 4. Mark target as claimed by this user in Redis (expire in 60s to clean up)
    await redisClient.sAdd(claimKey, targetId);
    await redisClient.expire(claimKey, 60);

    // 5. Calculate Score based on speed: Max 1000 points, Min 100 points
    const scoreDelta = Math.max(100, Math.floor(1000 - responseTime));

    // 6. Update user's score in the database
    const match = await Match.findOneAndUpdate(
      { _id: matchId, 'players.userId': userId },
      { $inc: { 'players.$.score': scoreDelta } },
      { new: true }
    );

    if (!match) {
      return { valid: false, scoreDelta: 0, newScore: 0 };
    }

    const playerRecord = match.players.find((p) => p.userId.toString() === userId);
    const newScore = playerRecord ? playerRecord.score : 0;

    return {
      valid: true,
      scoreDelta,
      newScore,
    };
  }

  /**
   * Ends the match, computes standings, triggers prize distributions, and broadcasts results.
   */
  private static async endMatch(matchId: string, roomId: string) {
    console.log(`🏁 Match ${matchId} ended. Distributing prizes...`);

    try {
      const updatedMatch = await WalletService.distributePrizes(matchId);

      // Emit game-over results
      this.ioServer.to(roomId).emit('game_over', {
        matchId,
        status: updatedMatch.status,
        players: updatedMatch.players.map((p: any) => ({
          userId: p.userId.toString(),
          username: p.username,
          score: p.score,
          rank: p.rank,
          payout: p.payout,
        })),
        prizePool: updatedMatch.prizePool,
        totalPool: updatedMatch.totalPool,
      });

      // Cleanup remaining target Redis keys
      const keys = await redisClient.keys(`match:${matchId}:*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`❌ Error ending match ${matchId}:`, error);
      this.ioServer.to(roomId).emit('game_error', {
        message: 'An error occurred during prize distribution.',
      });
    }
  }
}
export default GameEngine;
