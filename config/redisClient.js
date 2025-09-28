const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await redisClient.connect();
    console.log("✅ Connected to Redis Cloud");
  })();
}

module.exports = redisClient;