import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env or backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

// Collect allowed frontend origins from environment variables or default to localhost
const customFrontendUrls = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
]
  .filter(Boolean)
  .flatMap((url) => url.split(',').map((u) => u.trim().replace(/\/$/, '')));

const localDevOrigins = [
  `http://localhost:${process.env.FRONTEND_PORT || 3000}`,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const allOrigins = Array.from(new Set([...customFrontendUrls, ...localDevOrigins]));

export const config = {
  port: parseInt(process.env.PORT || process.env.BACKEND_PORT || '5000', 10),
  frontendPort: parseInt(process.env.FRONTEND_PORT || '3000', 10),
  corsOrigins: allOrigins,

  /**
   * Evaluates if a given requesting origin is allowed by CORS
   * @param {string|undefined} origin 
   * @returns {boolean}
   */
  isOriginAllowed(origin) {
    if (!origin) return true; // Server-to-server, curl, mobile
    const cleanOrigin = origin.replace(/\/$/, '');

    // Direct match against configured origins
    if (allOrigins.includes(cleanOrigin)) return true;

    // Support any Vercel deployment (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(cleanOrigin)) return true;

    // Allow localhost/127.0.0.1 in non-production
    if (process.env.NODE_ENV !== 'production') {
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
        return true;
      }
    }

    return false;
  },
};
