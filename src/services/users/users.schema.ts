// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'
import { passwordHash } from '@feathersjs/authentication-local'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'
import type { UserService } from './users.class'

// Add new types for linked accounts
export const linkedAccountSchema = Type.Object({
  address: Type.String(),
  type: Type.String(),
  verifiedAt: Type.String(),
  firstVerifiedAt: Type.Union([Type.String(), Type.Null()]),
  latestVerifiedAt: Type.String(),
  chainType: Type.Optional(Type.String()),
  chainId: Type.Optional(Type.String()),
  walletClient: Type.Optional(Type.String()),
  walletClientType: Type.Optional(Type.String()),
  connectorType: Type.Optional(Type.String()),
  imported: Type.Optional(Type.Boolean()),
  delegated: Type.Optional(Type.Boolean())
}, { $id: 'feathers-base/LinkedAccount' })

// Main data model schema
export const userSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    email: Type.String(),
    password: Type.Optional(Type.String()),
    walletAddress: Type.Optional(Type.String()),
    privyUserId: Type.Optional(Type.String()),
    isGuest: Type.Boolean({ default: false }),
    hasAcceptedTerms: Type.Boolean({ default: false }),
    createdAt: Type.String(),
    accessLevel: Type.Number({ default: 1 }),
    tokenBalance: Type.Optional(Type.Number()),
    linkedAccounts: Type.Array(linkedAccountSchema, { default: [] })
  },
  { $id: 'feathers-base/UserSchema' }
)
export type User = Static<typeof userSchema>
export const userValidator = getValidator(userSchema, dataValidator)

// Add resolver with proper type handling and default values
export const userResolver = resolve<User, HookContext<UserService>>({})

export const userExternalResolver = resolve<User, HookContext<UserService>>({
  password: async () => undefined
})

// Schema for creating new entries
export const userDataSchema = Type.Pick(
  userSchema, 
  ['email', 'password', 'walletAddress', 'privyUserId', 'isGuest', 'hasAcceptedTerms', 'createdAt', 'accessLevel', 'linkedAccounts'],
  { $id: 'feathers-base/UserDataSchema' }
)
export type UserData = Static<typeof userDataSchema>
export const userDataValidator = getValidator(userDataSchema, dataValidator)
export const userDataResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' })
})

// Schema for updating existing entries
export const userPatchSchema = Type.Object({
  _id: Type.Optional(ObjectIdSchema()),
  email: Type.Optional(Type.String()),
  password: Type.Optional(Type.String()),
  walletAddress: Type.Optional(Type.String()),
  privyUserId: Type.Optional(Type.String()),
  isGuest: Type.Optional(Type.Boolean()),
  hasAcceptedTerms: Type.Optional(Type.Boolean()),
  createdAt: Type.Optional(Type.String()),
  accessLevel: Type.Optional(Type.Number()),
  tokenBalance: Type.Optional(Type.Number()),
  linkedAccounts: Type.Optional(Type.Array(linkedAccountSchema))
}, { 
  $id: 'feathers-base/UserPatchSchema',
  additionalProperties: false 
})

export type UserPatch = Static<typeof userPatchSchema>
export const userPatchValidator = getValidator(userPatchSchema, dataValidator)
export const userPatchResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' })
})

// Schema for allowed query properties
export const userQueryProperties = Type.Pick(userSchema, [
  '_id',
  'email',
  'walletAddress',
  'privyUserId',
  'isGuest',
  'hasAcceptedTerms'
] as const)
export const userQuerySchema = Type.Intersect(
  [
    querySyntax(userQueryProperties),
    Type.Object({}, { additionalProperties: false })
  ],
  { 
    $id: 'feathers-base/UserQuerySchema',
    additionalProperties: false 
  }
)
export type UserQuery = Static<typeof userQuerySchema>
export const userQueryValidator = getValidator(userQuerySchema, queryValidator)
export const userQueryResolver = resolve<UserQuery, HookContext<UserService>>({})
