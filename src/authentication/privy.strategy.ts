import { AuthenticationBaseStrategy, AuthenticationResult } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import { Params } from '@feathersjs/feathers'

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
    privyToken: string
  }, params: Params): Promise<AuthenticationResult> {
    const { privyUser, privyToken } = authentication

    console.log('[PrivyStrategy] Starting authentication process:', {
      userId: privyUser.id,
      isGuest: privyUser.isGuest,
      linkedAccountsCount: privyUser.linkedAccounts.length
    })

    try {
      // First verify the Privy token
      console.log('[PrivyStrategy] Verifying Privy token...')
      const verifiedPrivyUser = await this.verifyPrivyUser(privyToken)
      console.log('[PrivyStrategy] Token verified successfully for user:', JSON.stringify(verifiedPrivyUser))

      // Verify that the provided user matches the token
      if (verifiedPrivyUser.id !== privyUser.id) {
        console.error('[PrivyStrategy] User ID mismatch:', {
          providedId: privyUser.id,
          verifiedId: verifiedPrivyUser.id
        })
        throw new NotAuthenticated('Invalid user data')
      }

      const users = this.app?.service('users')
      if (!users) {
        console.error('[PrivyStrategy] Users service not found')
        throw new Error('Users service not found')
      }

      // Get primary identifiers
      const primaryEmail = this.getPrimaryEmail(privyUser)
      const primaryWallet = this.getPrimaryWallet(privyUser)

      console.log('[PrivyStrategy] Primary identifiers:', {
        primaryEmail: primaryEmail || 'none',
        primaryWallet: primaryWallet || 'none'
      })

      // Try to find existing user
      console.log('[PrivyStrategy] Searching for existing user...')
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
        console.log('[PrivyStrategy] No existing user found, creating new user...')
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

          console.log('[PrivyStrategy] Creating new user with data:', userData)
          user = await users.create(userData)
          console.log('[PrivyStrategy] New user created successfully:', user._id)
        } catch (error: any) {
          if (error.code === 11000) {
            console.log('[PrivyStrategy] Duplicate key error during creation, retrying find...')
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
              console.error('[PrivyStrategy] Failed to create or find user after duplicate key error')
              throw new NotAuthenticated('Failed to create or find user')
            }
            console.log('[PrivyStrategy] Found user after duplicate key error:', user._id)
          } else {
            console.error('[PrivyStrategy] User creation error:', error)
            throw error
          }
        }
      } else {
        console.log('[PrivyStrategy] Existing user found, updating with latest Privy data...')
        try {
          const updates = {
            privyUserId: privyUser.id,
            linkedAccounts: privyUser.linkedAccounts || [],
            hasAcceptedTerms: privyUser.hasAcceptedTerms,
            isGuest: privyUser.isGuest
          }
          console.log('[PrivyStrategy] Updating user with data:', updates)
          user = await users.patch(user._id, updates)
          console.log('[PrivyStrategy] User updated successfully')
        } catch (error) {
          console.error('[PrivyStrategy] User update error:', error)
        }
      }

      console.log('[PrivyStrategy] Authentication successful for user:', user._id)
      return {
        authentication: { strategy: 'privy' },
        user
      }
    } catch (error) {
      console.error('[PrivyStrategy] Authentication error:', error)
      throw new NotAuthenticated('Authentication failed')
    }
  }

  private getPrimaryEmail(privyUser: PrivyUser): string | undefined {
    const emailAccount = privyUser.linkedAccounts.find(account => account.type === 'email')
    console.log('[PrivyStrategy] Found primary email:', emailAccount?.address)
    return emailAccount?.address
  }

  private getPrimaryWallet(privyUser: PrivyUser): string | undefined {
    const walletAccount = privyUser.linkedAccounts.find(account => account.type === 'wallet')
    console.log('[PrivyStrategy] Found primary wallet:', walletAccount?.address)
    return walletAccount?.address
  }

  private async verifyPrivyUser(privyToken: string): Promise<PrivyUser> {
    console.log('[PrivyStrategy] Starting Privy token verification...')

    if (!privyToken) {
      console.error('[PrivyStrategy] No token provided')
      throw new NotAuthenticated('No Privy token provided')
    }

    try {
      console.log('[PrivyStrategy] Making request to Privy API...')
      const response = await fetch('https://auth.privy.io/api/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${privyToken}`,
          'Content-Type': 'application/json',
          'privy-app-id': this.app?.get('authentication').privyProjectId
        }
      });

      if (!response.ok) {
        const error = await response.json()
        console.error('[PrivyStrategy] Privy API error:', {
          status: response.status,
          statusText: response.statusText,
          error
        })
        throw new NotAuthenticated(`Privy verification failed: ${error.message || 'Unknown error'}`)
      }

      const verifiedUser = await response.json()
      console.log('[PrivyStrategy] Privy verification successful:', {
        userId: verifiedUser.id,
        isGuest: verifiedUser.isGuest,
        linkedAccountsCount: verifiedUser.linkedAccounts?.length
      })

      return verifiedUser as PrivyUser
    } catch (error) {
      console.error('[PrivyStrategy] Privy verification error:', error)
      throw new NotAuthenticated('Failed to verify Privy token')
    }
  }
}