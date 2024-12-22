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
    find: [],
    get: [],
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
    all: []
  },
  error: {
    all: []
  }
} 