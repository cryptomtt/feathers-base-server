import { AuthenticationBaseStrategy, AuthenticationResult } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import { Params } from '@feathersjs/feathers'

// Define clear interfaces for Privy data structures
interface PrivyLinkedAccount {
  address: string
  type: string
  verifiedAt: string
  firstVerifiedAt: string | null
  latestVerifiedAt: string
  chainType?: string
  chainId?: string
  walletClient?: string
  walletClientType?: string
  connectorType?: string
  imported?: boolean
  delegated?: boolean
}

interface PrivyUser {
  id: string
  createdAt: string
  hasAcceptedTerms: boolean
  isGuest: boolean
  linkedAccounts: PrivyLinkedAccount[]
}

export class PrivyStrategy extends AuthenticationBaseStrategy {
  async authenticate(authentication: {
    strategy: string
    privyUser: PrivyUser
  }, params: Params): Promise<AuthenticationResult> {
    const { privyUser } = authentication

    try {
      const users = this.app?.service('users')
      if (!users) {
        throw new Error('Users service not found')
      }

      // Get primary identifiers
      const primaryEmail = this.getPrimaryEmail(privyUser)
      const primaryWallet = this.getPrimaryWallet(privyUser)

      // Try to find existing user
      let user = await users.find({
        query: {
          $or: [
            { privyUserId: privyUser.id },
            ...(primaryEmail ? [{ email: primaryEmail }] : []),
            ...(primaryWallet ? [{ walletAddress: primaryWallet?.toLowerCase() }] : [])
          ]
        }
      }).then(result => result.data[0])

      if (!user) {
        // Try to create user, handle potential race conditions
        try {
          const userData = {
            privyUserId: privyUser.id,
            email: primaryEmail || `${privyUser.id}@privy.user`,
            walletAddress: primaryWallet?.toLowerCase(),
            isGuest: privyUser.isGuest,
            hasAcceptedTerms: privyUser.hasAcceptedTerms,
            createdAt: privyUser.createdAt,
            accessLevel: 1,
            linkedAccounts: privyUser.linkedAccounts || []
          }
          
          user = await users.create(userData)
        } catch (error: any) {
          // If duplicate key error, try to find the user again
          if (error.code === 11000) {
            user = await users.find({
              query: {
                $or: [
                  { privyUserId: privyUser.id },
                  ...(primaryEmail ? [{ email: primaryEmail }] : []),
                  ...(primaryWallet ? [{ walletAddress: primaryWallet.toLowerCase() }] : [])
                ]
              }
            }).then(result => result.data[0])

            if (!user) {
              throw new NotAuthenticated('Failed to create or find user')
            }
          } else {
            throw error
          }
        }
      } else {
        // Always update with latest Privy data
        try {
          const updates = {
            privyUserId: privyUser.id,
            linkedAccounts: privyUser.linkedAccounts || [],
            hasAcceptedTerms: privyUser.hasAcceptedTerms,
            isGuest: privyUser.isGuest
          }
          user = await users.patch(user._id, updates)
        } catch (error) {
          console.error('User update error:', error)
        }
      }

      return {
        authentication: { strategy: 'privy' },
        user
      }
    } catch (error) {
      console.error('Authentication error:', error)
      throw new NotAuthenticated('Authentication failed')
    }
  }

  private getPrimaryEmail(privyUser: PrivyUser): string | undefined {
    const emailAccount = privyUser.linkedAccounts.find(account => account.type === 'email')
    return emailAccount?.address
  }

  private getPrimaryWallet(privyUser: PrivyUser): string | undefined {
    const walletAccount = privyUser.linkedAccounts.find(account => account.type === 'wallet')
    return walletAccount?.address
  }
} 