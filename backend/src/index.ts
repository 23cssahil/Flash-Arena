import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { initSocket } from './socket';

// Import routes
import authRoutes from './routes/authRoutes';
import walletRoutes from './routes/walletRoutes';
import matchRoutes from './routes/matchRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // Ensure local assets can be loaded if needed
}));

app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiter (Prevent API abuse, 100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Health Check API
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date(), 
    uptime: process.uptime() 
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global error encountered:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Bootstrapping function
const bootstrap = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();

    // Initialize Socket Server Events
    initSocket(io);

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Flash Arena Server running on port ${PORT}`);
      console.log(`🌐 Allowed CORS Origin: ${frontendUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap the Flash Arena Server:', error);
    process.exit(1);
  }
};

bootstrap();
