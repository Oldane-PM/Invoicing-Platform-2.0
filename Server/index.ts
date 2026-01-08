import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet()); // Security headers

// CORS configuration - explicitly allow Authorization header
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic route
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Invoice App API is running',
    timestamp: new Date().toISOString(),
  });
});

// Import routes
import exampleRoutes from './routes/example.routes';
import invoiceRoutes from './routes/invoice.routes';

// Register routes
app.use('/api/example', exampleRoutes);
// Invoice routes (e.g., /api/submissions/:id/invoice)
app.use('/api/submissions', invoiceRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: any) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Health Check: http://localhost:${PORT}/api/health`);
});

export default app;
