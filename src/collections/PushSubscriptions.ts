import type { CollectionConfig } from 'payload'

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    // Users can only read their own subscriptions
    read: ({ req: { user } }) => {
      if (!user) return false
      return {
        user: {
          equals: user.id,
        },
      }
    },
    // Users can only create their own subscriptions
    create: ({ req: { user } }) => !!user,
    // Users can only delete their own subscriptions
    delete: ({ req: { user } }) => {
      if (!user) return false
      return {
        user: {
          equals: user.id,
        },
      }
    },
    update: () => false, // Subscriptions shouldn't be updated, only created/deleted
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who owns this subscription',
      },
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      admin: {
        description: 'Push subscription endpoint',
      },
    },
    {
      name: 'keys',
      type: 'group',
      fields: [
        {
          name: 'p256dh',
          type: 'text',
          required: true,
        },
        {
          name: 'auth',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
  timestamps: true,
}
