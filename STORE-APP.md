# Native app (Capacitor) notes

Branch `store-app`. The web build is unchanged; native code is gated by `Capacitor.isNativePlatform()` (src/lib/nativeApp.ts).

- `npm run cap:sync` builds the web app and copies it into ios/ and android/.
- Bundle id `com.capstonebible.app` is a PLACEHOLDER (capacitor.config.ts, ios pbxproj, android build.gradle). Confirm before first upload; it cannot change afterward.
- No Apple Team ID is committed. Set the signing team in Xcode when the seller type (Individual vs Organization) is known.
- Needs Xcode (full app, not Command Line Tools) to build iOS, and a JDK + Android SDK for Android.
- Icons/splash: resources/ -> `npm run cap:assets` (regenerates ios/android assets; delete the stray `icons/` folder it makes).
