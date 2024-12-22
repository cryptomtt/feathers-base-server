import { Type, getValidator, defaultAppConfiguration } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import { dataValidator } from './validators'

// Redis configuration schema
const redisConfigurationSchema = Type.Object({
  url: Type.String(),
  password: Type.Optional(Type.String()),
  prefix: Type.Optional(Type.String()),
  ttl: Type.Optional(Type.Number())
})

export const configurationSchema = Type.Intersect([
  defaultAppConfiguration,
  Type.Object({
    host: Type.String(),
    port: Type.Number(),
    public: Type.String(),
    privyProjectId: Type.String(),
    redis: redisConfigurationSchema
  })
])

export type ApplicationConfiguration = Static<typeof configurationSchema>

export const configurationValidator = getValidator(configurationSchema, dataValidator)
