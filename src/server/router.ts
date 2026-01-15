import { createTRPCRouter } from './trpc'
import { usersRouter } from './routers/users'
import { groupsRouter } from './routers/groups'
import { checkInsRouter } from './routers/checkIns'
import { dashboardRouter } from './routers/dashboard'
import { settingsRouter } from './routers/settings'
import { pushRouter } from './routers/push'

export const appRouter = createTRPCRouter({
  users: usersRouter,
  groups: groupsRouter,
  checkIns: checkInsRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  push: pushRouter,
})

export type AppRouter = typeof appRouter
