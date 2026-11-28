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
import { installScreenCapture } from './lib/screenCapture'
// Skins (every signed-in reader). Must load AFTER App.css (imported via App above) so its overrides win ties.
import './skins.css'
// Photographs behind the bare landing screens. After skins.css for the same reason.
import './pageBackgrounds.css'

// Applied synchronously, before the first paint, so a reader who chose "dark" doesn't see a flash
// of the default light theme first — ThemeProvider's own effect (same localStorage key) takes over
// from here once React mounts.
document.documentElement.setAttribute('data-theme', localStorage.getItem('app-theme') === 'dark' ? 'dark' : 'light')

startUpdateChecks()

// Report a Problem screenshots: start noting which fonts and images the page loads (lib/screenCapture.ts).
installScreenCapture()
// Fidelity probe for the screenshot capture. Only in builds made with VITE_CAPTURE_PROBE=1; the
// constant comparison lets the bundler drop the import from every other build.
if (import.meta.env.VITE_CAPTURE_PROBE === '1') {
  void import('./lib/screenCaptureProbe').then((m) => m.installCaptureProbe())
}

// Testing / Live feature stages (sql/039). Loads once, fails open to Live — see lib/features.ts.
startFeatureRelease()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TextSizeProvider>
        <MobileTabsProvider>
          <SkinController />
          <App />
        </MobileTabsProvider>
      </TextSizeProvider>
    </ThemeProvider>
  </StrictMode>,
)
