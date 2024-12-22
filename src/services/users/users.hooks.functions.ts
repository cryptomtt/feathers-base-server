import { HookContext } from '@feathersjs/feathers'

export const setCreatedAt = async (context: HookContext) => {
  context.data.createdAt = new Date().toISOString()
  return context
}

export const setDefaultData = async (context: HookContext) => {
  context.data = {
    isGuest: false,
    hasAcceptedTerms: false,
    accessLevel: 1,
    linkedAccounts: [],
    ...context.data
  }
  return context
}

export const validatePatchData = async (context: HookContext) => {
  const allowedFields = ['hasAcceptedTerms', 'accessLevel'] as const
  const updateData = {} as Record<string, any>

  allowedFields.forEach(field => {
    if (context.data[field] !== undefined) {
      updateData[field] = context.data[field]
    }
  })

  context.data = updateData
  return context
} 