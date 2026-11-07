# ZhurekAI patient app

iPhone app for the 90-day post-stent program at [zhurekai.kz](https://zhurekai.kz). It connects to the program's bracelet (GAWSUG Y25, which pairs with QRing) and adds medication reminders, a pills-left countdown, a daily check-in, a blood pressure diary, an emergency card and a PDF report for the doctor, in Russian and Kazakh.

## Run the preview

```bash
npm install
EXPO_PUBLIC_DEMO=1 npx expo start --web
```

The web preview has no Bluetooth or notifications. Use **Ещё → Браслет → Показать демо-браслет** for sample data, which is always labelled as demo and is never uploaded.

## Checks

```bash
npm test && npm run typecheck && npm run lint
```

## Put it on an iPhone (no Mac needed)

You need a paid [Apple Developer account](https://developer.apple.com/programs/) and a free [Expo account](https://expo.dev/signup).

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest device:create          # register your iPhone
npx eas-cli@latest build --profile development --platform ios
npx expo start --dev-client               # after installing the build
```

`npx eas-cli@latest build --profile production --platform ios` followed by `npx eas-cli@latest submit --platform ios` sends a build to TestFlight and the App Store. The bundle ID `kz.zhurekai.app` in `app.json` is a placeholder: change it before the first build if you prefer another.

## Test the real bracelet

The Bluetooth code follows the protocol documented for Colmi R02 rings. **It has not yet run on a Y25.**

1. Unpair the bracelet from QRing, and close QRing.
2. In the development build open **Ещё → Браслет → Найти браслет** and choose the Y25.
3. Check battery, steps and pulse against what QRing showed.
4. Tap **Отправить журнал** and send the log to whoever is working on `src/band/`, whatever the result.

| Feature | Status |
| --- | --- |
| Battery, clock, steps, heart-rate log, live pulse | Written from the documented protocol, covered by tests against its sample packets, unverified on Y25 |
| Sleep | Not implemented for the real bracelet: the reference client doesn't decode it. Demo mode shows sample sleep. |
| Blood oxygen | Not implemented |
| Bracelet vibrating at medication times | Not implemented or verified. Reminders are iPhone notifications, but zhurekai.kz currently promises vibration. |
| Sync in the background | Not implemented: data updates when the app is open |

## Server

Data stays on the phone until `EXPO_PUBLIC_API_URL` is set and the patient has given consent and entered a participant code. See [docs/SERVER_API.md](docs/SERVER_API.md) for what the university server has to implement.

## Before release

- A cardiologist reviews the check-in questions and the rules in `checkInResult` (`src/lib/logic.ts`), which decide when the app says to call 103.
- A native speaker reviews `src/i18n/kk.ts`, which is a machine-written draft.
- A local lawyer reviews consent wording and health data handling under Kazakhstan's personal data law.
- Write a privacy policy for the app, which App Store review will require.

## Layout

- `src/app/`: screens (Expo Router)
- `src/band/`: bracelet protocol, client, Bluetooth transport, demo data
- `src/lib/`: data model and rules, report, server sync, reminders
- `src/i18n/`: Russian and Kazakh text
- `src/ui/`: brand tokens and shared components
- `tests/`: unit tests

## Credits

Bluetooth protocol details come from [tahnok/colmi_r02_client](https://github.com/tahnok/colmi_r02_client) (MIT).
