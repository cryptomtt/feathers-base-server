import { HookContext } from '@feathersjs/feathers'
import { logger } from '../logger'

interface CacheOptions {
  ttl: number
  prefix: string
  excludePaths: string[]
}

export const createRedisCache = (options: CacheOptions) => {
  return {
    before: async (context: HookContext) => {
      if (context.method !== 'find' && context.method !== 'get') return context
      if (options.excludePaths.includes(context.path)) {
        logger.debug(`[Cache] Skipping cache for excluded path: ${context.path}`)
        return context
      }

      const client = context.app.get('redisClient')
      const key = `${options.prefix}${context.path}:${context.method}:${JSON.stringify(context.params.query || {})}`
      
      logger.debug(`[Cache] Checking cache for key: ${key}`, {
        service: context.path,
        method: context.method,
        query: context.params.query
      })

      try {
        const cached = await client.get(key)
        if (cached) {
          logger.info(`[Cache] Cache hit for ${context.path}:${context.method}`, {
            key,
            dataSize: cached.length
          })
          context.result = JSON.parse(cached)
          return context
        }

        logger.debug(`[Cache] Cache miss for ${context.path}:${context.method}`, {
          key,
          query: context.params.query
        })
      } catch (error) {
        logger.error('[Cache] Error reading from cache:', {
          error,
          key,
          service: context.path,
          method: context.method
        })
      }

      return context
    },

    after: async (context: HookContext) => {
      if (context.method !== 'find' && context.method !== 'get') return context
      if (options.excludePaths.includes(context.path)) return context

      const client = context.app.get('redisClient')
      const key = `${options.prefix}${context.path}:${context.method}:${JSON.stringify(context.params.query || {})}`
      const data = JSON.stringify(context.result)

      try {
        logger.debug(`[Cache] Attempting to cache result for ${key}`, {
          dataSize: data.length,
          ttl: options.ttl
        })

        const startTime = Date.now()
        await client.set(key, data, {
          EX: options.ttl
        })
        const duration = Date.now() - startTime

        logger.info(`[Cache] Successfully cached result`, {
          key,
          dataSize: data.length,
          ttl: options.ttl,
          duration: `${duration}ms`
        })
      } catch (error) {
        logger.error('[Cache] Failed to cache result:', {
          error,
          key,
          service: context.path,
          method: context.method,
          dataSize: data.length
        })
      }

      return context
    },

    error: async (context: HookContext) => {
      logger.error(`[Cache] Error in ${context.path}:${context.method}:`, {
        error: context.error,
        service: context.path,
        method: context.method,
        query: context.params.query
      })
      return context
    }
  }
}