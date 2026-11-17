// Native (Capacitor) bootstrap. Inert in a browser: Capacitor.isNativePlatform() is false there,
// so nothing below runs and the plugin chunks are never even downloaded (dynamic imports).
import { Capacitor } from '@capacitor/core'
import { PUBLIC_ORIGIN } from './nativeShare'

/** Pages that exist only as static HTML on the website (pre-rendered), not as screens inside the app. */
const WEBSITE_ONLY_PATHS = /^\/(terms|privacy|support|delete-account|library|places|sites|people|topics|events)(\/|$)/

/** Inside the app, links to the website's own pages and to other sites open in the system browser
 * (an in-app WebView navigation to them would either 404 or strand the reader with no way back). */
export function nativeLinkTarget(href: string, currentOrigin: string): string | null {
  let u: URL
  try {
    u = new URL(href, currentOrigin)
  } catch {
    return null
  }
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') return u.href
  // Compare scheme + host, not .origin: a custom scheme such as capacitor://localhost can report an opaque origin.
  const here = new URL(currentOrigin)
  if (u.protocol === here.protocol && u.host === here.host) {
    return WEBSITE_ONLY_PATHS.test(u.pathname) ? `${PUBLIC_ORIGIN}${u.pathname}${u.search}${u.hash}` : null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  return u.href
}

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
    // Website pages and outside links open in the system browser, not inside the app window.
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const target = nativeLinkTarget(a.getAttribute('href') ?? '', window.location.origin)
      if (!target) return
      e.preventDefault()
      void import('@capacitor/browser').then(({ Browser }) => Browser.open({ url: target }))
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
