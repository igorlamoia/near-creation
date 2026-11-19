import { TooltipProvider } from './components/ui/tooltip'
import React from 'react'
import ReactDOM from 'react-dom/client'
import GlowCursor from './components/GlowCursor'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './styles/app.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={350}>
      <RouterProvider router={router} />
    </TooltipProvider>
    <GlowCursor
      className="site-glow-cursor"
      color="#3868D9"
      secondaryColor="#8860D8"
      intensity={0.35}
      trailWidth={3.5}
      linger={0.3}
      glow={0.3}
      clickBurst
      theme="dark"
      aria-hidden="true"
    />
  </React.StrictMode>,
)
