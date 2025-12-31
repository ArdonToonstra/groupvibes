import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'displayName',
  },
  auth: true,
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: true,
      admin: {
        description: 'Display name shown to group members',
      },
    },

    {
      name: 'groupID',
      type: 'relationship',
      relationTo: 'groups',
      admin: {
        description: 'Group this user belongs to',
      },
    },
  ],
}
