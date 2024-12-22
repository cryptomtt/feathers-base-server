// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { User, UserData, UserPatch, UserQuery, UserService } from './users.class'

export type { User, UserData, UserPatch, UserQuery }

export const userPath = 'users'

export const userMethods: Array<keyof UserService> = ['find', 'get', 'create', 'patch', 'remove']
