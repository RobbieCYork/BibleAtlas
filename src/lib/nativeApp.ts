// Native (Capacitor) bootstrap. Inert in a browser: Capacitor.isNativePlatform() is false there,
// so nothing below runs and the plugin chunks are never even downloaded (dynamic imports).
import { Capacitor } from '@capacitor/core'

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  document.documentElement.classList.add('native-app')
  try {
    const [{ StatusBar, Style }, { App }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/app'),
    ])
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#7c3aed' })
    }
    await StatusBar.setStyle({ style: Style.Dark })
    // Deep links / universal links: route https://capstonebible.com/... and capstonebible:// into the SPA.
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const u = new URL(url)
        const path = u.pathname + u.search + u.hash
        if (path && path !== '/') {
          window.history.pushState({}, '', path)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
      } catch { /* ignore malformed URL */ }
    })
    // Android back: step back in history, exit only at the root.
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else void App.exitApp()
    })
  } catch (e) {
    console.warn('native init failed', e)
  }
}
