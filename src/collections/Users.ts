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
      name: 'themeColor',
      type: 'text',
      required: true,
      defaultValue: '#3B82F6',
      admin: {
        description: 'Personal theme color (hex code)',
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
