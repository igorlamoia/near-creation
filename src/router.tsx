import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import RouteLayout from './pages/RouteLayout'
import Dashboard from './pages/Dashboard'
import Materials from './pages/Materials'
import Pricing from './pages/Pricing'
import Products from './pages/Products'
import Settings from './pages/Settings'

const rootRoute = createRootRoute({ component: RouteLayout })

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})
const dashboardAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
})
const materialsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/materials',
  component: Materials,
})
const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pricing',
  component: Pricing,
})
const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: Products,
})
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  dashboardAliasRoute,
  materialsRoute,
  pricingRoute,
  productsRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  basepath: '/near-creation',
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
