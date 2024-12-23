import { HookContext } from '@feathersjs/feathers'
import { logger } from '../logger'

interface InvalidateCacheOptions {
  invalidateRelated?: boolean  // Whether to invalidate related caches
  relatedPaths?: string[]      // Related paths to invalidate
  customPattern?: string       // Custom pattern for cache invalidation
}

export const invalidateCache = (options: InvalidateCacheOptions = {}) => {
  return async (context: HookContext) => {
    try {
      const client = context.app.get('redisClient')
      const patterns: string[] = []

      // Add main service pattern
      patterns.push(`feathers:cache:${context.path}:*`)

      // Add custom pattern if provided
      if (options.customPattern) {
        patterns.push(options.customPattern)
      }

      // Add related paths patterns
      if (options.invalidateRelated && options.relatedPaths) {
        patterns.push(...options.relatedPaths.map(path => `feathers:cache:${path}:*`))
      }

      logger.debug('[CacheInvalidation] Invalidation patterns:', patterns)

      let totalInvalidated = 0
      for (const pattern of patterns) {
        logger.debug(`[CacheInvalidation] Looking for keys matching pattern: ${pattern}`)
        
        const keys = await client.keys(pattern)
        if (keys.length > 0) {
          logger.info(`[CacheInvalidation] Found ${keys.length} keys to invalidate for pattern: ${pattern}`)
          logger.debug('[CacheInvalidation] Keys:', keys)
          
          await client.del(keys)
          totalInvalidated += keys.length
          
          logger.info(`[CacheInvalidation] Successfully invalidated keys for pattern: ${pattern}`)
        } else {
          logger.debug(`[CacheInvalidation] No keys found for pattern: ${pattern}`)
        }
      }

      if (totalInvalidated > 0) {
        logger.info(`[CacheInvalidation] Total keys invalidated: ${totalInvalidated}`)
      }

      return context
    } catch (error) {
      logger.error('[CacheInvalidation] Error invalidating cache:', {
        error,
        service: context.path,
        method: context.method,
        id: context.id
      })
      // Don't throw error to prevent affecting the main operation
      return context
    }
  }
}

// Usage example:
/*
app.service('users').hooks({
  after: {
    create: [
      invalidateCache({
        invalidateRelated: true,
        relatedPaths: ['profiles', 'settings'],
        customPattern: 'feathers:cache:dashboard:*'
      })
    ]
  }
})
*/