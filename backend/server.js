import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './src/config/index.js';
import { logger } from './src/utils/logger.js';
import { setupSocketHandlers } from './src/socket/socketHandler.js';

const app = express();
const server = http.createServer(app);

// Production-Safe CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (config.isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      logger.warn(`Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Basic health endpoint as specified in requirements
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    project: 'UNO Arena',
  });
});

// Root ping endpoint
app.get('/', (req, res) => {
  res.send('UNO Arena Backend API is running.');
});

// Realtime Socket.IO configuration with matching CORS rules
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (config.isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Setup socket connection handlers
setupSocketHandlers(io);

// Start server
const PORT = config.port;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  logger.info(`UNO Arena backend listening on ${HOST}:${PORT}`);
  logger.info(`Health check available at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
  logger.info(`Allowed CORS origins: ${config.corsOrigins.join(', ')} (plus *.vercel.app)`);
});

export { app, server, io };
