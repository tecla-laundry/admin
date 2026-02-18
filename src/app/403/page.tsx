import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
          </div>
          <CardDescription>
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This page is restricted to admin users only. If you believe this is an error,
            please contact your administrator.
          </p>
          <Link href="/sign-in">
            <Button variant="outline" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
