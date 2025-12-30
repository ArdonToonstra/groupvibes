import type { CollectionConfig } from 'payload'

export const Groups: CollectionConfig = {
  slug: 'groups',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    // Users can only read their own group
    read: ({ req: { user } }) => {
      if (!user) return false
      return {
        id: {
          equals: user.groupID,
        },
      }
    },
    // Only authenticated users can create groups
    create: ({ req: { user } }) => !!user,
    // Only group members can update their group (admin controls)
    update: ({ req: { user } }) => {
      if (!user) return false
      return {
        id: {
          equals: user.groupID,
        },
      }
    },
    delete: () => false, // Disable deletion for safety
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Group name',
      },
    },
    {
      name: 'inviteCode',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique invite code for joining the group',
        readOnly: true,
      },
    },
    {
      name: 'frequency',
      type: 'number',
      required: true,
      defaultValue: 2,
      admin: {
        description: 'Number of pings per day',
      },
    },
    {
      name: 'intervalMode',
      type: 'select',
      required: true,
      defaultValue: 'random',
      options: [
        {
          label: 'Random',
          value: 'random',
        },
        {
          label: 'Fixed',
          value: 'fixed',
        },
      ],
      admin: {
        description: 'Ping schedule type',
      },
    },
    {
      name: 'quietHoursStart',
      type: 'number',
      admin: {
        description: 'Quiet hours start (24h format, e.g., 23 for 11 PM)',
      },
    },
    {
      name: 'quietHoursEnd',
      type: 'number',
      admin: {
        description: 'Quiet hours end (24h format, e.g., 7 for 7 AM)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who created this group',
      },
    },
  ],
}
