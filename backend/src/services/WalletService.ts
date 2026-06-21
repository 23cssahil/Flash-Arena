import mongoose from 'mongoose';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import Match from '../models/Match';
import Notification from '../models/Notification';
import Leaderboard from '../models/Leaderboard';

export class WalletService {
  /**
   * Retrieves the wallet balance for a user.
   */
  static async getBalance(userId: string | mongoose.Types.ObjectId): Promise<number> {
    const wallet = await Wallet.findOne({ userId });
    return wallet ? wallet.balance : 0;
  }

  /**
   * Credits a user's wallet atomically and writes a transaction log.
   */
  static async credit(
    userId: string | mongoose.Types.ObjectId,
    amount: number,
    type: 'deposit' | 'payout' | 'refund' | 'faucet',
    description: string,
    referenceId?: string | mongoose.Types.ObjectId
  ) {
    if (amount <= 0) {
      throw new Error('Credit amount must be greater than zero');
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    );

    const transaction = await Transaction.create({
      userId,
      amount,
      type,
      status: 'completed',
      referenceId,
      description,
    });

    return { wallet, transaction };
  }

  /**
   * Debits a user's wallet atomically, preventing overdrafts, and logs the result.
   */
  static async debit(
    userId: string | mongoose.Types.ObjectId,
    amount: number,
    type: 'withdrawal' | 'entry_fee',
    description: string,
    referenceId?: string | mongoose.Types.ObjectId
  ) {
    if (amount <= 0) {
      throw new Error('Debit amount must be greater than zero');
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );

    if (!wallet) {
      await Transaction.create({
        userId,
        amount: -amount,
        type,
        status: 'failed',
        referenceId,
        description: `${description} (Failed: Insufficient balance)`,
      });
      throw new Error('Insufficient balance');
    }

    const transaction = await Transaction.create({
      userId,
      amount: -amount,
      type,
      status: 'completed',
      referenceId,
      description,
    });

    return { wallet, transaction };
  }

  /**
   * Finalizes the match status as crashed, logs notifications, and refreshes leaderboard counts.
   */
  static async closeMatch(
    matchId: string | mongoose.Types.ObjectId,
    crashMultiplier: number
  ): Promise<any> {
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status === 'crashed') {
      return match;
    }

    match.status = 'crashed';
    match.crashMultiplier = crashMultiplier;
    match.endTime = new Date();
    await match.save();

    for (const player of match.players) {
      if (player.cashedOut && player.payout && player.payout > 0) {
        // Successful Cashout: Increments leaderboard wins
        await Leaderboard.findOneAndUpdate(
          { userId: player.userId },
          {
            $setOnInsert: { username: player.username },
            $inc: {
              gamesPlayed: 1,
              wins: 1,
              totalEarned: player.payout,
            },
          },
          { upsert: true, new: true }
        );

        await Notification.create({
          userId: player.userId,
          title: '🏆 Cashout Successful!',
          message: `You cashed out at ${player.cashoutMultiplier?.toFixed(2)}x and received ${player.payout} coins!`,
          type: 'match',
        });
      } else {
        // Player Crashed: Lose stake
        await Leaderboard.findOneAndUpdate(
          { userId: player.userId },
          {
            $setOnInsert: { username: player.username },
            $inc: {
              gamesPlayed: 1,
            },
          },
          { upsert: true, new: true }
        );

        await Notification.create({
          userId: player.userId,
          title: '💥 Room Crashed',
          message: `Lobby crashed at ${crashMultiplier.toFixed(2)}x. You lost your stake of ${player.stake} coins.`,
          type: 'match',
        });
      }
    }

    return match;
  }

  /**
   * Refunds all players if a lobby is cancelled (e.g. not enough players join).
   */
  static async refundMatch(matchId: string | mongoose.Types.ObjectId): Promise<void> {
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    match.status = 'crashed'; // Treat as crashed/cancelled
    match.endTime = new Date();
    await match.save();

    for (const player of match.players) {
      await this.credit(
        player.userId,
        player.stake,
        'refund',
        `Match ${match._id} cancelled. Stake refunded.`,
        match._id
      );

      await Notification.create({
        userId: player.userId,
        title: 'Match Cancelled',
        message: `Lobby cancelled. Your stake of ${player.stake} coins has been refunded.`,
        type: 'wallet',
      });
    }
  }
}
export default WalletService;
