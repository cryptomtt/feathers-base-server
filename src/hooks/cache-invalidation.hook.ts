import { HookContext } from '@feathersjs/feathers'
import { createClient } from 'redis'

export const invalidateCache = () => {
    let redisClient: ReturnType<typeof createClient>

    const getRedisClient = async (app: any) => {
        if (!redisClient) {
            redisClient = createClient(app.get('redis'))
            await redisClient.connect()
        }
        return redisClient
    }

    return async (context: HookContext) => {
        try {
            console.log('[CacheInvalidation] Invalidating cache...')
            const redis = await getRedisClient(context.app)

            // Get all keys matching the service pattern
            const pattern = `feathers:cache:${context.path}:*`
            console.log('[CacheInvalidation] Pattern:', pattern)

            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
                await redis.del(keys)
                console.log('[CacheInvalidation] Invalidated keys:', keys.length)
            }
        } catch (error) {
            console.error('[CacheInvalidation] Error:', error)
        }

        return context
    }
}