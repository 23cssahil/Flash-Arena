import { Schema, model, Document, Types } from 'mongoose';

export interface IWallet extends Document {
  userId: Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { 
      type: Number, 
      required: true, 
      default: 1000.0, 
      min: [0, 'Insufficient balance'] 
    },
  },
  { timestamps: true }
);

export default model<IWallet>('Wallet', WalletSchema);
