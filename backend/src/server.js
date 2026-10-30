import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import apiRoutes from './routes/api.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDatabase } from './db/initDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database and tables
initializeDatabase();

const app = express();

// Directories
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const TARGETS_DIR = path.join(UPLOADS_DIR, 'targets');

// Middleware
app.use(cors({
  origin: '*', // Allow all local dev origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded video and image files statically
app.use('/uploads/videos', express.static(VIDEOS_DIR));
app.use('/uploads/targets', express.static(TARGETS_DIR));

// API Routes
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` 🦅 Bird Eye View - Multi-Angle Video & Detection API`);
  console.log(` 🚀 Server running at: http://localhost:${config.port}`);
  console.log(`=======================================================`);
});

export default app;
