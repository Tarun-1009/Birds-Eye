import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import apiRoutes from './routes/api.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
});

export default app;

