// For more information about this file see https://dove.feathersjs.com/guides/cli/authentication.html
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { PrivyStrategy } from './authentication/privy.strategy'

import type { Application } from './declarations'

declare module './declarations' {
  interface ServiceTypes {
    authentication: AuthenticationService
  }
}

export const authentication = (app: Application) => {
  const authentication = new AuthenticationService(app)

  authentication.register('jwt', new JWTStrategy())
  authentication.register('local', new LocalStrategy())
  authentication.register('privy', new PrivyStrategy())

  // Add Privy to the allowed authentication strategies
  const config = app.get('authentication')
  if (config && Array.isArray(config.authStrategies)) {
    config.authStrategies.push('privy')
  }

  app.use('authentication', authentication)
}
