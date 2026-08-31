import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/viewportHeight'
import App from './App.tsx'
import { TextSizeProvider } from './lib/textSize.tsx'
import { ThemeProvider } from './lib/theme.tsx'

// Applied synchronously, before the first paint, so a reader who chose "dark" doesn't see a flash
// of the default light theme first — ThemeProvider's own effect (same localStorage key) takes over
// from here once React mounts.
document.documentElement.setAttribute('data-theme', localStorage.getItem('app-theme') === 'dark' ? 'dark' : 'light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TextSizeProvider>
        <App />
      </TextSizeProvider>
    </ThemeProvider>
  </StrictMode>,
)
