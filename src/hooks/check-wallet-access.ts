import { Hook, HookContext } from '@feathersjs/feathers'
import { Forbidden } from '@feathersjs/errors'

export const checkWalletAccess = (requiredLevel = 1): Hook => {
  return async (context: HookContext) => {
    const { user } = context.params

    if (!user) {
      throw new Forbidden('Authentication required')
    }

    // If user has a wallet address, verify their access level
    if (user.walletAddress) {
      // Here you can add logic to check token balances
      // For example, query an external service or blockchain
      
      if (user.accessLevel < requiredLevel) {
        throw new Forbidden('Insufficient access level')
      }
    }

    return context
  }
} 