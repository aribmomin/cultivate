import './loadEnv.js';
import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows / ISP DNS servers that refuse SRV record queries for mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore if not permitted
}

/**
 * Reusable MongoDB Connection Manager supporting MongoDB Atlas and Local MongoDB.
 * Never hardcodes credentials and provides clear diagnostics.
 */

const STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const getConnectionStatus = () => {
  const readyState = mongoose.connection.readyState;
  return {
    state: STATE_MAP[readyState] || 'unknown',
    isConnected: readyState === 1,
    host: readyState === 1 ? mongoose.connection.host : null,
    name: readyState === 1 ? mongoose.connection.name : null,
  };
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('<username>')) {
    console.warn('\n⚠️  [MongoDB Warning]: MONGODB_URI is not configured in server/.env.');
    console.warn('👉 Please set MONGODB_URI in server/.env with your MongoDB Atlas or local MongoDB connection string.\n');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    console.log(`✅ [MongoDB Connected]: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error('\n❌ [MongoDB Connection Error]: Could not connect to MongoDB database.');
    console.error(`   Details: ${error.message}`);
    console.error('👉 Please verify your MONGODB_URI, IP whitelist on MongoDB Atlas, and network connection.\n');
    return null;
  }
};

