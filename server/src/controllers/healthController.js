import { getConnectionStatus } from '../config/db.js';

/**
 * Health check controller.
 * Reports server uptime, environment, and MongoDB connection status.
 */
export const getHealth = (req, res) => {
  const dbStatus = getConnectionStatus();

  const isHealthy = dbStatus.isConnected;

  const response = {
    success: true,
    status: isHealthy ? 'healthy' : 'degraded',
    message: isHealthy
      ? 'Organic Farming Learning Platform API is operational and connected to database.'
      : 'API server is running, but MongoDB database is currently disconnected.',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      state: dbStatus.state,
      isConnected: dbStatus.isConnected,
      host: dbStatus.host,
      databaseName: dbStatus.name,
    },
  };

  if (!dbStatus.isConnected) {
    response.database.advisory =
      'To connect to MongoDB Atlas or local MongoDB, specify a valid MONGODB_URI in server/.env.';
  }

  res.status(200).json(response);
};

