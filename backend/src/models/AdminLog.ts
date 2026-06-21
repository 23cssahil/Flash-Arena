import { Schema, model, Document, Types } from 'mongoose';

export interface IAdminLog extends Document {
  adminId: Types.ObjectId;
  action: string;
  details: Schema.Types.Map;
  ipAddress?: string;
  createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    details: { type: Map, of: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IAdminLog>('AdminLog', AdminLogSchema);
