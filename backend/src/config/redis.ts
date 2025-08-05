import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Redis | null = null;

// Only create Redis client if URL is provided
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    reconnectOnError: (err: Error) => {
      console.error('Redis reconnect error:', err);
      return true;
    },
  });

  redisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis error:', err);
  });
} else {
  console.log('Redis URL not provided - running without Redis cache');
}

export default redisClient;