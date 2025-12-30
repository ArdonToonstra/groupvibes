import configPromise from '@payload-config'
import { RootLayout } from '@payloadcms/next/layouts'
/* This is the root layout for the Payload Admin UI */
import React from 'react'

import { importMap } from '@/payload-importmap'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout config={configPromise} importMap={importMap}>
    {children}
  </RootLayout>
)

export default Layout
