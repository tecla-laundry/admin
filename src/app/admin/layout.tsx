import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AuthGuard } from '@/components/admin/auth-guard'
import { ErrorBoundary } from '@/components/error-boundary'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Client-side auth check via AuthGuard component
  // This uses the auth context which has the shared Supabase client instance
  // and can properly read the session from cookies
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
