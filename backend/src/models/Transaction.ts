import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  amount: number; // Positive for credits, negative for debits
  type: 'deposit' | 'withdrawal' | 'entry_fee' | 'payout' | 'refund' | 'faucet';
  status: 'pending' | 'completed' | 'failed';
  referenceId?: Types.ObjectId; // E.g., Match ID
  description: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { 
      type: String, 
      enum: ['deposit', 'withdrawal', 'entry_fee', 'payout', 'refund', 'faucet'], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed'], 
      default: 'completed', 
      required: true 
    },
    referenceId: { type: Schema.Types.ObjectId, index: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<ITransaction>('Transaction', TransactionSchema);
