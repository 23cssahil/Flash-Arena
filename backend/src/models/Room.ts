import { Schema, model, Document, Types } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  entryFee: number;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'playing' | 'crashed';
  players: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true },
    entryFee: { type: Number, required: true, default: 0 },
    maxPlayers: { type: Number, required: true, default: 5 },
    status: { 
      type: String, 
      enum: ['waiting', 'countdown', 'playing', 'crashed'], 
      default: 'waiting' 
    },
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default model<IRoom>('Room', RoomSchema);
