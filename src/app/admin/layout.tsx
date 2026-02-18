import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthGuard } from '@/components/admin/auth-guard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client-side auth check via AuthGuard component
  // This uses the auth context which has the shared Supabase client instance
  // and can properly read the session from cookies
  return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
