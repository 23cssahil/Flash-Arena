# Flash Arena - Real-time Reaction Gaming Platform

Flash Arena is a production-grade, highly scalable, real-time multiplayer reaction-speed gaming platform designed for mobile-first modern browsers. Players utilize virtual coins to enter lobbies, click spawning targets, and receive instant prize pool distributions based on their reaction latency.

---

## Technical Stack & Architecture

### Frontend
- **Framework:** Next.js 13 (App Router)
- **State Management:** React Context API (`AuthContext`, `SocketContext`)
- **Styling:** Tailwind CSS (Custom futuristic neon color tokens)
- **Animations:** Framer Motion
- **Web Audio API:** Real-time synthesis of sound effects for zero network latency and low-overhead playability.
- **Visual Hype:** Canvas Confetti for victory states.

### Backend
- **Framework:** Node.js + Express.js + TypeScript
- **Real-time Gateway:** Socket.IO
- **Database:** MongoDB (Mongoose models)
- **Caching & State:** Redis
- **Security & Sessioning:** JSON Web Tokens (Access & rotated HTTPOnly Refresh Tokens) + BCrypt password hashing.

---

## Directory Structure

```
flash-arena/
├── backend/
│   ├── src/
│   │   ├── config/             # Database, Redis, Game constants
│   │   ├── controllers/        # Express handlers (Auth, Wallet, Matches, Admin)
│   │   ├── middleware/         # Security guards, Rate limiters, Authentication
│   │   ├── models/             # MongoDB Mongoose schemas
│   │   ├── routes/             # API routing tables
│   │   ├── services/           # WalletService (Prizes), Matchmaker, GameEngine
│   │   ├── socket/             # Socket.IO handlers & JWT authorization
│   │   └── index.ts            # App bootsrapper
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/                 # PWA icons & manifest assets
│   ├── src/
│   │   ├── app/                # Next.js Pages (Landing, Dashboard, Arena, Admin...)
│   │   ├── components/         # HUD modules & reusable Navbar
│   │   ├── context/            # Global Auth & Socket.IO clients
│   │   └── utils/              # Client wrappers
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development & Docker Setup

To run the complete platform locally including MongoDB, Redis, the Express gateway, and the Next.js server, use Docker Compose.

### Prerequisites
- Docker & Docker Compose installed.

### Execution
1. Clone the repository and navigate to the project directory:
   ```bash
   cd flash-arena
   ```
2. Build and spin up all containers:
   ```bash
   docker-compose up --build
   ```
3. Once running:
   - Next.js Frontend is active at: `http://localhost:3000`
   - Express backend is listening at: `http://localhost:5000`
   - MongoDB running at: `localhost:27017`
   - Redis running at: `localhost:6379`

4. To tear down the docker orchestration:
   ```bash
   docker-compose down
   ```

---

## Environment Variables Configuration

Both frontend and backend are configured via environment variables. See [.env.example](file:///.env.example) for a template:

### Backend Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express & Socket.IO server | `5000` |
| `MONGO_URI` | Connection string for MongoDB | `mongodb://localhost:27017/flash_arena` |
| `REDIS_URL` | Redis URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for access token signing | `replace_with_a_secure_string` |
| `JWT_REFRESH_SECRET`| Secret key for refresh token signing | `replace_with_a_secure_string` |
| `FRONTEND_URL` | Allowed CORS header origin | `http://localhost:3000` |
| `INITIAL_COINS` | Coin balance allocated to new accounts | `1000` |
| `DEFAULT_COMMISSION`| Commission percent retained by the platform | `10` |

### Frontend Configuration
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL`| Target API endpoint for requests | `http://localhost:5000` |
| `NEXT_PUBLIC_WS_URL` | Target Gateway endpoint for socket streams| `http://localhost:5000` |

---

## Security Safeguards

- **Atomic Transactions:** Wallet credits and debits utilize atomic MongoDB `findOneAndUpdate` filtering (such as `balance: { $gte: amount }` check for debits) to prevent race conditions and overdrafts, ensuring `Total Payout <= PrizePool` under all conditions.
- **Anti-Cheat Validation:** The server evaluates click reaction logs against the target spawn time. Click reactions faster than $100\text{ms}$ are flagged and rejected.
- **Anti-Double-Click Guard:** Claimed target lists are stored in Redis sets per player and expire automatically. Subsequent clicks on identical target IDs are discarded.
- **Websocket Authentication:** Sockets must provide valid JWTs during handshakes. Anonymous sockets are rejected.
- **Rate-Limiting:** Express APIs are rate-limited using `express-rate-limit`. Faucet claims are throttled using Redis keys expiring in 24 hours.

---

## Render Production Deployment Guide

Deploy Flash Arena to Render directly from GitHub using these steps:

### 1. Redis Instance Setup
1. Log in to Render.
2. Click **New** -> **Redis**.
3. Name: `flash-arena-redis`.
4. Max Connections: Default. Select **Free** or Starter tier.
5. Create. Note the internal Redis Connection String (e.g. `redis://red-xxxx:6379`).

### 2. MongoDB Atlas Setup (Managed MongoDB)
Render does not host persistent databases in its web service. Set up a free cluster on MongoDB Atlas:
1. Log in to MongoDB Atlas and create a Free Shared Cluster.
2. In Database Access, create a database user and record credentials.
3. In Network Access, allow access from `0.0.0.0/0` (required for Render to connect).
4. Copy the connection string: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/flash_arena?retryWrites=true&w=majority`.

### 3. Backend Deployment (Web Service)
1. In Render, click **New** -> **Web Service**.
2. Link your GitHub repository.
3. Name: `flash-arena-backend`.
4. Environment: `Node`.
5. Build Command: `cd backend && npm install && npm run build`.
6. Start Command: `cd backend && npm run start`.
7. Expand **Advanced** and add the following Environment Variables:
   - `PORT`: `10000` (Render handles internal port binding automatically)
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `your-mongodb-atlas-connection-string`
   - `REDIS_URL`: `your-render-internal-redis-connection-string`
   - `JWT_SECRET`: `your-secure-production-jwt-secret-string`
   - `JWT_REFRESH_SECRET`: `your-secure-production-refresh-secret-string`
   - `FRONTEND_URL`: `https://flash-arena-frontend.onrender.com` (Use your actual frontend URL once generated)
8. Click **Create Web Service**. Note the active backend URL (e.g. `https://flash-arena-backend.onrender.com`).

### 4. Frontend Deployment (Static Site / Web Service)
Next.js using server-side features like middleware or API routing should be deployed as a Web Service on Render, rather than a Static Site.
1. Click **New** -> **Web Service**.
2. Link your GitHub repository.
3. Name: `flash-arena-frontend`.
4. Environment: `Node`.
5. Build Command: `cd frontend && npm install && npm run build`.
6. Start Command: `cd frontend && npm run start`.
7. Under **Advanced**, add environment variables:
   - `NEXT_PUBLIC_API_URL`: `https://flash-arena-backend.onrender.com` (Your Render backend URL)
   - `NEXT_PUBLIC_WS_URL`: `https://flash-arena-backend.onrender.com`
8. Click **Create Web Service**.
9. Go back to your Backend Web Service configurations, and update `FRONTEND_URL` to match the exact frontend URL provided by Render (e.g., `https://flash-arena-frontend.onrender.com`). Trigger a new deploy on the backend.
