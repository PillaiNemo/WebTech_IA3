// config/db.js
// Connects to MongoDB with Mongoose and reports the connection state.
// If MongoDB is not running yet, we keep retrying instead of crashing,
// so the server (and its status page) stays up.

const mongoose = require('mongoose');

const RETRY_DELAY_MS = 5000;

// mongoose.connection.readyState is a number; these are its meanings.
const READY_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing in server/.env, so the database is not connected.');
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection failed (${err.message}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    // setTimeout hands the retry to the event loop, so the server keeps answering requests meanwhile.
    setTimeout(connectDB, RETRY_DELAY_MS);
  }
}

// Mongoose is an event emitter: log later drops so they are visible in the terminal.
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

// Small summary used by GET /api/health.
function getDbStatus() {
  const conn = mongoose.connection;
  const state = READY_STATES[conn.readyState] || 'unknown';
  return {
    state,
    name: state === 'connected' ? conn.name : null,
    host: state === 'connected' ? conn.host : null
  };
}

// Sends a "ping" command and measures the round trip in milliseconds.
async function pingDB() {
  if (mongoose.connection.readyState !== 1) return null;
  const start = Date.now();
  await mongoose.connection.db.admin().ping();
  return Date.now() - start;
}

module.exports = { connectDB, getDbStatus, pingDB };
