import { Outlet, useLocation } from '@tanstack/react-router'
import AppShell from '../components/AppShell'

/** Shared route boundary. Individual pages own their page-level composition. */
export default function RouteLayout() {
  const pathname = useLocation({ select: (location) => location.pathname })
  if (pathname.endsWith('/simulator') || pathname.endsWith('/simulador')) return <Outlet />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
