import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/flash_arena';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoURI);
    console.log('✔ MongoDB connected successfully.');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // Exit process with failure
    process.exit(1);
  }
};
