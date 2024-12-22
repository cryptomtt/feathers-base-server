import { authenticate } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  userResolver,
  userExternalResolver,
  userDataResolver,
  userPatchResolver
} from './users.schema'
import {
  setCreatedAt,
  setDefaultData,
  validatePatchData
} from './users.hooks.functions'
import { createRedisCache } from '../../hooks/cache.hook'
import { invalidateCache } from '../../hooks/cache-invalidation.hook'

// Initialize cache hooks with excluded paths
const cache = createRedisCache({
  ttl: 3600,
  prefix: 'feathers:cache:',
  excludePaths: ['authentication', 'authManagement']  // Add any other auth-related paths
})

export default {
  around: {
    all: [
      schemaHooks.resolveExternal(userExternalResolver),
      schemaHooks.resolveResult(userResolver)
    ],
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [],
    patch: [authenticate('jwt')],
    remove: [authenticate('jwt')]
  },
  before: {
    all: [],
    find: [cache.before],
    get: [cache.before],
    create: [
      setDefaultData,
      setCreatedAt,
      schemaHooks.resolveData(userDataResolver)
    ],
    patch: [
      validatePatchData,
      schemaHooks.resolveData(userPatchResolver)
    ],
    remove: []
  },
  after: {
    all: [],
    find: [cache.after],
    get: [cache.after],
    create: [invalidateCache()],
    patch: [invalidateCache()],
    remove: [invalidateCache()]
  },
  error: {
    all: [],
    get: [cache.error]
  }
}