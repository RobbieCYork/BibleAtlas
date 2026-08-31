import type { Plugin } from 'vite'

/**
 * Writes a version.json into the build output containing a unique id for this build
 * (the current timestamp). The app fetches this file (with cache disabled) whenever it
 * comes back into the foreground and reloads itself if the id has changed.
 *
 * This exists because the app has no service worker: when installed to a phone's home
 * screen, iOS/Android keep the standalone WKWebView/WebView process alive across app
 * switches instead of doing a normal page load, so a new deployment doesn't reliably
 * show up until the OS decides to kill and relaunch the process (sometimes not until a
 * second relaunch). Polling a tiny, always-fresh JSON file on foreground lets the app
 * detect a new deployment and reload itself immediately instead of waiting on that.
 */
export function buildIdPlugin(): Plugin {
  const buildId = String(Date.now())

  return {
    name: 'build-id',
    config() {
      return {
        define: {
          __BUILD_ID__: JSON.stringify(buildId),
        },
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId }),
      })
    },
  }
}
