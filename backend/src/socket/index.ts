import { Server, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/auth';
import Matchmaker from '../services/Matchmaker';
import CrashEngine from '../services/CrashEngine';
import Match from '../models/Match';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export const initSocket = (io: Server) => {
  CrashEngine.init(io);

  // ── JWT Authentication Middleware ─────────────────────────────────────────
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const raw = socket.handshake.auth.token || socket.handshake.headers.authorization;
      if (!raw) return next(new Error('Authentication error: No token provided'));
      const token = raw.startsWith('Bearer ') ? raw.split(' ')[1] : raw;
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId   = socket.user?.userId;
    const username = socket.user?.username;
    if (!userId || !username) { socket.disconnect(); return; }

    console.log(`🔌 Connected: ${username} (${socket.id})`);

    // ── Matchmaking ───────────────────────────────────────────────────────────
    socket.on('join_queue', async (data: { entryFee: number }) => {
      const { entryFee } = data;
      if (typeof entryFee !== 'number' || entryFee < 0) {
        return socket.emit('error_alert', { message: 'Invalid entry fee.' });
      }
      try {
        const result = await Matchmaker.joinQueue(userId, entryFee);
        if (result.matchCreated && result.matchId && result.roomId) {
          // Notify all matched players
          io.emit(`match_found:${entryFee}`, {
            matchId: result.matchId,
            roomId:  result.roomId,
            players: result.players,
          });
          await CrashEngine.startMatchLifecycle(result.matchId, result.roomId);
        } else {
          socket.emit('queue_joined', { entryFee, message: 'Waiting for players...' });
        }
      } catch (err: any) {
        socket.emit('error_alert', { message: err.message || 'Failed to join queue' });
      }
    });

    socket.on('leave_queue', async (data: { entryFee: number }) => {
      try {
        await Matchmaker.leaveQueue(userId, data.entryFee);
        socket.emit('queue_left', { entryFee: data.entryFee });
      } catch {
        socket.emit('error_alert', { message: 'Failed to leave queue' });
      }
    });

    // ── Room Navigation ───────────────────────────────────────────────────────
    socket.on('join_room', (data: { roomId: string }) => {
      if (data.roomId) {
        socket.join(data.roomId);
        console.log(`🚪 ${username} joined room ${data.roomId}`);
      }
    });

    // ── Crash Cashout ─────────────────────────────────────────────────────────
    socket.on('cash_out', async (data: { matchId: string }) => {
      const { matchId } = data;
      if (!matchId) return;
      try {
        const result = await CrashEngine.processCashout(matchId, userId);
        if (!result.success) {
          socket.emit('cashout_denied', { message: result.error });
        }
        // Success is broadcast inside CrashEngine via player_cashed_out event
      } catch (err: any) {
        console.error('Cashout error:', err);
        socket.emit('error_alert', { message: 'Cashout failed. Please try again.' });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Disconnected: ${username}`);
      const tiers = [10, 50, 100, 500];
      for (const tier of tiers) {
        await Matchmaker.leaveQueue(userId, tier).catch(() => {});
      }
    });
  });
};

export default initSocket;
