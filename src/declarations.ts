// For more information about this file see https://dove.feathersjs.com/guides/cli/typescript.html
import { HookContext as FeathersHookContext, NextFunction } from '@feathersjs/feathers'
import { Application as FeathersApplication } from '@feathersjs/koa'
import { ApplicationConfiguration } from './configuration'

import { User } from './services/users/users.schema'
import type { RedisClientType, RedisDefaultModules } from 'redis'

export type { NextFunction }

// The types for app.get(name) and app.set(name)
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Configuration extends ApplicationConfiguration {
  redisClient: RedisClientType<RedisDefaultModules>
  redis: {
    url: string
    database: number
    prefix: string
    ttl: number
  }
}

// A mapping of service names to types. Will be extended in service files.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceTypes {}

// The application instance type that will be used everywhere else
export type Application = FeathersApplication<ServiceTypes, Configuration>

// The context for hook functions - can be typed with a service class
export type HookContext<S = any> = FeathersHookContext<Application, S>

// Add the user as an optional property to all params
declare module '@feathersjs/feathers' {
  interface Params {
    user?: User
  }
}
