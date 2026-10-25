const mongoose = require('mongoose');

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  
  // If an explicit remote URI (like Atlas mongodb+srv://) is provided, try connecting
  if (uri && !uri.includes('127.0.0.1') && !uri.includes('localhost')) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`⚠️ Remote MongoDB connection failed: ${error.message}. Switching to in-memory MongoDB...`);
    }
  }

  // If local URI is provided, test if local mongod is active
  if (uri && (uri.includes('127.0.0.1') || uri.includes('localhost'))) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
      console.log(`✅ Local MongoDB connected: ${conn.connection.host}`);
      return;
    } catch {
      // Local mongod not running, fallback to memory server
    }
  }

  // Spin up MongoMemoryServer for instant zero-config development
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`🚀 In-Memory MongoDB engine active (${conn.connection.host}). Zero-config instant local dev enabled!`);
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB engine:', error.message);
  }
};

module.exports = connectDB;


