import { Outlet } from '@tanstack/react-router'
import AppShell from '../components/AppShell'

/** Shared route boundary. Individual pages own their page-level composition. */
export default function RouteLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
