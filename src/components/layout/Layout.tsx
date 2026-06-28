import React from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div
      className="bg-mesh"
      style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}
    >
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '28px', maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
