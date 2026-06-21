import { Server } from 'socket.io';
import Match from '../models/Match';
import WalletService from './WalletService';
import { GAME_CONSTANTS } from '../config/constants';

interface ActiveRoomState {
  matchId: string;
  roomId: string;
  multiplier: number;
  timer: NodeJS.Timeout | null;
}

export class CrashEngine {
  private static ioServer: Server;
  
  // Track active room states in memory
  private static activeRooms = new Map<string, ActiveRoomState>();

  /**
   * Initializes the socket server instance.
   */
  static init(io: Server) {
    this.ioServer = io;
  }

  /**
   * Starts the countdown phase for a crash lobby.
   */
  static async startMatchLifecycle(matchId: string, roomId: string) {
    console.log(`🚀 Starting Crash countdown for match: ${matchId}`);
    let countdown = GAME_CONSTANTS.COUNTDOWN_DURATION;

    this.ioServer.to(roomId).emit('countdown_update', { countdown });

    const interval = setInterval(async () => {
      countdown--;
      this.ioServer.to(roomId).emit('countdown_update', { countdown });

      if (countdown <= 0) {
        clearInterval(interval);
        await this.startMultiplierTicker(matchId, roomId);
      }
    }, 1000);
  }

  /**
   * Starts the active multiplier growth ticks.
   */
  private static async startMultiplierTicker(matchId: string, roomId: string) {
    console.log(`📈 Crash Room ${matchId} is now LIVE.`);

    // Update Match status in database
    await Match.findByIdAndUpdate(matchId, { 
      status: 'playing',
      startTime: new Date() 
    });

    this.ioServer.to(roomId).emit('game_start', {
      message: 'Multiplier is climbing!',
    });

    const roomState: ActiveRoomState = {
      matchId,
      roomId,
      multiplier: 1.00,
      timer: null,
    };

    // Register active room
    this.activeRooms.set(matchId, roomState);

    // Start 100ms Ticker loop
    roomState.timer = setInterval(async () => {
      await this.tickRoom(matchId);
    }, GAME_CONSTANTS.CRASH_TICK_RATE_MS);
  }

  /**
   * Executes a single multiplier tick. Handles risk engine calculations.
   */
  private static async tickRoom(matchId: string) {
    const state = this.activeRooms.get(matchId);
    if (!state) return;

    // 1. Fetch live match status
    const match = await Match.findById(matchId);
    if (!match || match.status !== 'playing') {
      this.clearRoomTicker(matchId);
      return;
    }

    // 2. Increment multiplier exponentially
    const nextMultiplier = state.multiplier * (1 + GAME_CONSTANTS.CRASH_GROWTH_RATE);

    // 3. Evaluate Active stakes & Liability
    const activePlayers = match.players.filter(p => !p.cashedOut);
    
    // If no active players left in lobby, close game peacefully
    if (activePlayers.length === 0) {
      console.log(`🏁 All players cashed out. Closing match ${matchId}.`);
      this.clearRoomTicker(matchId);
      await WalletService.closeMatch(matchId, state.multiplier);
      this.ioServer.to(state.roomId).emit('game_ended', {
        crashMultiplier: state.multiplier,
        message: 'Round completed successfully.',
      });
      return;
    }

    const sumActiveStakes = activePlayers.reduce((sum, p) => sum + p.stake, 0);
    const potentialLiability = nextMultiplier * sumActiveStakes;

    // 4. Check boundaries and crash conditions
    // Crash Condition A: Potential liability exceeds remaining prize pool
    // Crash Condition B: Multiplier exceeds max safe multiplier boundary
    const shouldCrash = 
      potentialLiability >= match.remainingPrizePool || 
      nextMultiplier >= match.maxSafeMultiplier;

    if (shouldCrash) {
      const finalCrashMultiplier = Math.min(nextMultiplier, match.maxSafeMultiplier);
      console.log(`💥 CRASH! Match ${matchId} crashed at ${finalCrashMultiplier.toFixed(2)}x`);
      
      this.clearRoomTicker(matchId);
      
      // Close database states
      await WalletService.closeMatch(matchId, finalCrashMultiplier);

      // Emit crash broadcast
      this.ioServer.to(state.roomId).emit('crash_event', {
        crashMultiplier: finalCrashMultiplier,
      });
      return;
    }

    // 5. Update state and emit ticker info
    state.multiplier = nextMultiplier;
    this.ioServer.to(state.roomId).emit('multiplier_update', {
      multiplier: nextMultiplier,
      remainingPrizePool: match.remainingPrizePool,
      activeStakes: sumActiveStakes,
    });
  }

  /**
   * Processes player cashout request.
   */
  static async processCashout(
    matchId: string,
    userId: string
  ): Promise<{ success: boolean; multiplier?: number; payout?: number; error?: string }> {
    const state = this.activeRooms.get(matchId);
    if (!state) {
      return { success: false, error: 'Room is not actively running.' };
    }

    // Capture current server-side multiplier at process time (anti-cheat latency buffer)
    const cashoutMultiplier = state.multiplier;

    // Use atomic transaction lock in Mongoose to mark player cashedOut
    // Checks that player belongs to match, hasn't cashedOut yet, and match is active
    const match = await Match.findOneAndUpdate(
      { 
        _id: matchId, 
        status: 'playing',
        players: { 
          $elemMatch: { userId, cashedOut: false } 
        } 
      },
      { 
        $set: { 'players.$.cashedOut': true, 'players.$.cashoutMultiplier': cashoutMultiplier } 
      },
      { new: true }
    );

    if (!match) {
      return { success: false, error: 'Cashout denied. Already cashed out or lobby ended.' };
    }

    // Find target player record
    const player = match.players.find(p => p.userId.toString() === userId);
    if (!player) {
      return { success: false, error: 'Player record not found.' };
    }

    // Calculate payout
    const payout = Math.floor(player.stake * cashoutMultiplier);

    // Subtract payout from remaining prize pool and set player payout in document
    await Match.updateOne(
      { _id: matchId, 'players.userId': userId },
      { 
        $inc: { remainingPrizePool: -payout },
        $set: { 'players.$.payout': payout }
      }
    );

    // Credit player wallet atomically
    await WalletService.credit(
      userId,
      payout,
      'payout',
      `Crash cashout at ${cashoutMultiplier.toFixed(2)}x`,
      matchId
    );

    // Broadcast cashout success to the room to update standings
    this.ioServer.to(state.roomId).emit('player_cashed_out', {
      userId,
      username: player.username,
      multiplier: cashoutMultiplier,
      payout,
    });

    // Notify user balance updated
    this.ioServer.to(state.roomId).emit('wallet_update', { userId });

    return {
      success: true,
      multiplier: cashoutMultiplier,
      payout,
    };
  }

  /**
   * Cleans up the room ticker timers.
   */
  private static clearRoomTicker(matchId: string) {
    const state = this.activeRooms.get(matchId);
    if (state) {
      if (state.timer) {
        clearInterval(state.timer);
      }
      this.activeRooms.delete(matchId);
    }
  }
}
export default CrashEngine;
