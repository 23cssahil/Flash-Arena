import { Schema, model, Document, Types } from 'mongoose';

export interface IMatchPlayer {
  userId: Types.ObjectId;
  username: string;
  stake: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  payout?: number;
}

export interface IMatch extends Document {
  roomId: Types.ObjectId;
  entryFee: number; // Baseline entry fee
  commissionPercent: number;
  platformFee: number;
  totalPool: number;
  prizePool: number;
  remainingPrizePool: number;
  maxSafeMultiplier: number;
  crashMultiplier?: number;
  players: IMatchPlayer[];
  status: 'countdown' | 'playing' | 'crashed';
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchPlayerSchema = new Schema<IMatchPlayer>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  stake: { type: Number, required: true, default: 0 },
  cashedOut: { type: Boolean, default: false },
  cashoutMultiplier: { type: Number },
  payout: { type: Number, default: 0 },
}, { _id: false });

const MatchSchema = new Schema<IMatch>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    entryFee: { type: Number, required: true },
    commissionPercent: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    totalPool: { type: Number, default: 0 },
    prizePool: { type: Number, default: 0 },
    remainingPrizePool: { type: Number, default: 0 },
    maxSafeMultiplier: { type: Number, default: 1.0 },
    crashMultiplier: { type: Number },
    players: [MatchPlayerSchema],
    status: { 
      type: String, 
      enum: ['countdown', 'playing', 'crashed'], 
      default: 'countdown' 
    },
    startTime: { type: Date },
    endTime: { type: Date },
  },
  { timestamps: true }
);

export default model<IMatch>('Match', MatchSchema);
