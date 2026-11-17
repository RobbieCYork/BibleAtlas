import type { CapacitorConfig } from '@capacitor/cli'

// Native shell config. The bundle/application id is a PLACEHOLDER until Robbie confirms it
// (it cannot change after the first store upload). No Apple Team ID lives here: set the signing
// team in Xcode (or via the APPLE_TEAM_ID the release script reads) when the account type is known.
const config: CapacitorConfig = {
  appId: 'com.capstonebible.app',
  appName: 'Capstone Bible',
  webDir: 'dist',
  ios: { contentInset: 'never' },
  plugins: {
    Keyboard: { resize: 'none' },
    StatusBar: { style: 'DARK', backgroundColor: '#7c3aed', overlaysWebView: false },
  },
}

export default config
