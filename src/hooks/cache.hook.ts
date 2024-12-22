import { HookContext } from '@feathersjs/feathers'
import { createClient } from 'redis'
import { NotFound } from '@feathersjs/errors'
import type { ApplicationConfiguration } from '../configuration'

interface CacheOptions {
    ttl?: number
    prefix?: string
    excludePaths?: string[]
}

export const createRedisCache = (options: CacheOptions = {}) => {
    let redisClient: ReturnType<typeof createClient> | null = null
    let isConnecting = false

    const getRedisClient = async (app: any) => {
        if (redisClient?.isOpen) {
            return redisClient
        }

        if (isConnecting) {
            return null
        }

        try {
            isConnecting = true
            const config = app.get('redis') as ApplicationConfiguration['redis']

            // Create Redis URL with authentication
            const redisUrl = new URL(config.url || 'redis://localhost:6379')
            redisUrl.password = encodeURIComponent(config.password || 'redis123')

            console.log('[CacheHook] Connecting to Redis with URL:', redisUrl.toString())

            redisClient = createClient({
                url: redisUrl.toString(),
                socket: {
                    reconnectStrategy: false
                }
            })

            redisClient.on('error', (err) => {
                console.error('[CacheHook] Redis Client Error:', err)
                if (redisClient?.isOpen) {
                    redisClient.quit().catch(console.error)
                }
                redisClient = null
            })

            await redisClient.connect()

            // Test connection
            await redisClient.ping()
            console.log('[CacheHook] Redis Client Connected and Ping successful')

            return redisClient
        } catch (error) {
            console.error('[CacheHook] Redis Connection Error:', error)
            if (redisClient) {
                try {
                    await redisClient.quit()
                } catch (quitError) {
                    console.error('[CacheHook] Error while closing Redis connection:', quitError)
                }
            }
            redisClient = null
            return null
        } finally {
            isConnecting = false
        }
    }

    const generateKey = (context: HookContext) => {
        const config = context.app.get('redis') as ApplicationConfiguration['redis']
        const prefix = options.prefix || config.prefix || 'feathers:cache:'
        const { method, path, id, params } = context
        const query = params.query ? JSON.stringify(params.query) : ''
        return `${prefix}${path}:${method}:${id || ''}:${query}`
    }

    const getCacheTTL = (context: HookContext): number => {
        const config = context.app.get('redis') as ApplicationConfiguration['redis']
        return options.ttl || config.ttl || 3600
    }

    const shouldSkipCache = (context: HookContext): boolean => {
        const excludedPaths = [
            'authentication',
            ...(options.excludePaths || [])
        ]
        return excludedPaths.includes(context.path)
    }

    return {
        before: async (context: HookContext) => {
            if (!['get', 'find'].includes(context.method) || shouldSkipCache(context)) {
                return context
            }

            try {
                const redis = await getRedisClient(context.app)
                if (!redis) {
                    console.log('[CacheHook] Skipping cache - Redis not available')
                    return context
                }

                const key = generateKey(context)
                const cached = await redis.get(key)

                if (cached) {
                    const parsedCache = JSON.parse(cached)
                    console.log('[CacheHook] Cache hit:', {
                        key,
                        timestamp: new Date().toISOString(),
                        resultType: parsedCache ? typeof parsedCache : 'null',
                        isArray: Array.isArray(parsedCache),
                        dataLength: Array.isArray(parsedCache) ? parsedCache.length : 1
                    })
                    context.result = parsedCache
                    return context
                }

                console.log('[CacheHook] Cache miss:', {
                    key,
                    timestamp: new Date().toISOString()
                })
                context._cacheKey = key
            } catch (error) {
                console.error('[CacheHook] Cache read error:', error)
            }

            return context
        },

        after: async (context: HookContext) => {
            if (!['get', 'find'].includes(context.method) || shouldSkipCache(context)) {
                return context
            }

            try {
                const redis = await getRedisClient(context.app)
                if (!redis) {
                    return context
                }

                const key = context._cacheKey
                if (key && context.result) {
                    console.log('[CacheHook] Caching result for:', key)
                    await redis.set(key, JSON.stringify(context.result), {
                        EX: getCacheTTL(context)
                    })
                }
            } catch (error) {
                console.error('[CacheHook] Cache write error:', error)
            }

            return context
        },

        error: async (context: HookContext) => {
            if (context.error instanceof NotFound && !shouldSkipCache(context)) {
                try {
                    const redis = await getRedisClient(context.app)
                    if (!redis) {
                        return context
                    }

                    const key = context._cacheKey
                    if (key) {
                        await redis.set(key, JSON.stringify(null), {
                            EX: getCacheTTL(context)
                        })
                    }
                } catch (error) {
                    console.error('[CacheHook] Cache error handling error:', error)
                }
            }
            return context
        }
    }
}