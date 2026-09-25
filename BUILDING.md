# Building and releasing

Android only. The `android/` directory is generated and gitignored — never edit
it by hand. Configure native behaviour in `app.json` and config plugins, then
regenerate:

```bash
npx expo prebuild --platform android --clean
```

Use `--clean` whenever icons, the splash screen or a config plugin changed.
Without it Gradle happily reuses stale resources and you end up verifying art
that is no longer in the repo.

## Checks before any build

```bash
npx tsc --noEmit
npx expo lint
```

## Development

```bash
npx expo run:android          # local debug build onto a connected device
npx expo start --dev-client   # Metro for an already-installed dev build
```

`npx expo run:android --device <name>` takes Expo's own device name, not an adb
serial. Passing a serial fails with "Could not find device with name".

## Release build locally

```bash
npx expo run:android --variant release
```

This is the only way to exercise R8 minification, resource shrinking and
`minSdkVersion 24` without going through EAS. The release variant is signed
with the debug keystore, so it installs on a test device but is not
distributable.

## Ad unit IDs

Real AdMob unit IDs are deliberately absent from the source. `src/lib/ads.ts`
uses Google's test units whenever `__DEV__` is true, or when the environment
variable is missing or malformed, so a build can never accidentally request
live ads against the wrong account.

Production builds read them from EAS environment variables in the `production`
environment:

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_ADMOB_BANNER` | `ca-app-pub-8701520764224100/7173428290` |
| `EXPO_PUBLIC_ADMOB_INTERSTITIAL` | `ca-app-pub-8701520764224100/6981856601` |

Create them once per project:

```bash
npx eas-cli@latest env:set --environment production \
  --name EXPO_PUBLIC_ADMOB_BANNER --value ca-app-pub-8701520764224100/7173428290

npx eas-cli@latest env:set --environment production \
  --name EXPO_PUBLIC_ADMOB_INTERSTITIAL --value ca-app-pub-8701520764224100/6981856601
```

`EXPO_PUBLIC_` variables are inlined into the JavaScript bundle at build time,
so they are readable by anyone who unpacks the app. That is expected for AdMob
unit IDs, which are public identifiers rather than secrets. Never put an actual
secret behind that prefix.

The AdMob *application* ID lives in `app.json`, because the Gradle script in
`react-native-google-mobile-ads` reads it from there at build time and cannot
take it from the environment.

## Cloud builds

```bash
npx eas-cli@latest build --platform android --profile preview      # APK to install directly
npx eas-cli@latest build --platform android --profile production   # AAB for Play
```

`appVersionSource: remote` means EAS owns `versionCode` and `autoIncrement`
bumps it on every production build. Do not bump it by hand in `app.json` as
well, or the two will disagree.

## Submitting

```bash
npx eas-cli@latest submit --platform android --profile production
```

Goes to the internal testing track first. Listing copy, the data safety answers
and the remaining graphics are in `store-listing.md`.
