import './config/loadEnv.js';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Initialize Database Connection
connectDB();

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌱 TerraLearn Organic Farming Backend API`);
  console.log(`🚀 Server running in [${process.env.NODE_ENV || 'development'}] mode`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`======================================================\n`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Keep server running in development, or gracefully close on fatal errors
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Graceful termination handling
const handleShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

