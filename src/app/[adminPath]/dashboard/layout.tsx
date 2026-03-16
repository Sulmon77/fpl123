// src/app/[adminPath]/dashboard/layout.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ adminPath: string }>
}) {
  const resolvedParams = await params
  
  // Server-side auth check
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || session !== adminPassword) {
    redirect(`/${resolvedParams.adminPath}`)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      <AdminSidebar adminPath={resolvedParams.adminPath} />

      {/* Main content */}
      <main className="flex-1 overflow-auto lg:pt-0 pt-14">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  )
}