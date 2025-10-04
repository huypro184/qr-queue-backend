const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await redisClient.connect();
    logger.info("✅ Connected to Redis Cloud");
  })();
}

module.exports = redisClient;