import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/viewportHeight'
import App from './App.tsx'
import { TextSizeProvider } from './lib/textSize.tsx'
import { ThemeProvider } from './lib/theme.tsx'
import { MobileTabsProvider } from './lib/mobileTabs.tsx'
import { startUpdateChecks } from './lib/updateCheck'
import { startFeatureRelease } from './lib/features'
import { SkinController } from './lib/skin'
// Skins (every signed-in reader). Must load AFTER App.css (imported via App above) so its overrides win ties.
import './skins.css'
import './plusPreview.css'
import PlusPreviewLegend from './components/PlusPreviewLegend'

// Applied synchronously, before the first paint, so a reader who chose "dark" doesn't see a flash
// of the default light theme first — ThemeProvider's own effect (same localStorage key) takes over
// from here once React mounts.
document.documentElement.setAttribute('data-theme', localStorage.getItem('app-theme') === 'dark' ? 'dark' : 'light')

startUpdateChecks()

// Testing / Live feature stages (sql/039). Loads once, fails open to Live — see lib/features.ts.
startFeatureRelease()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TextSizeProvider>
        <MobileTabsProvider>
          <SkinController />
          <App />
          <PlusPreviewLegend />
        </MobileTabsProvider>
      </TextSizeProvider>
    </ThemeProvider>
  </StrictMode>,
)
