const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('[INFO] MongoDB connected');
}

module.exports = { connectDB };
