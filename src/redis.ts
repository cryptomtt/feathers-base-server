import { createClient, RedisClientType, RedisDefaultModules } from 'redis'
import type { Application } from './declarations'
import { logger } from './logger'

let client: RedisClientType<RedisDefaultModules>

export const redis = async (app: Application) => {
  const config = app.get('redis')

  if (!client) {
    logger.info('Creating Redis client...')
    
    client = createClient({
      url: config.url,
      database: config.database || 0
    })

    client.on('error', (err) => {
      logger.error('Redis Client Error', err)
    })

    client.on('connect', () => {
      logger.info('Redis client connected')
    })

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...')
    })

    client.on('ready', () => {
      logger.info('Redis client ready')
    })

    try {
      await client.connect()
      app.set('redisClient', client as RedisClientType<RedisDefaultModules>)
    } catch (error) {
      logger.error('Failed to connect to Redis', error)
      throw error
    }
  }

  return client
}

export const getRedisClient = () => client

// For testing and cleanup
export const disconnectRedis = async () => {
  if (client) {
    await client.quit()
    client = undefined as any
  }
} 