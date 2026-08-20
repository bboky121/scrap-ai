# Mobile

Expo 54와 React Native WebView로 기존 웹을 앱에서 제공하는 모바일 클라이언트입니다. Google 로그인은 시스템 브라우저 OAuth 후 `kisbrief://auth/callback`으로 복귀하고, FCM으로 시간별 브리핑 알림을 받습니다.

`apps/mobile/.env`:

```env
EXPO_PUBLIC_WEB_URL=http://localhost:3100
EXPO_PUBLIC_API_URL=http://localhost:4100
```

Android SDK 초기화:

```bash
cd ../..
./scripts/setup-android-sdk.sh
```

Android 에뮬레이터에서 호스트 localhost 연결:

```bash
adb reverse tcp:3100 tcp:3100
adb reverse tcp:4100 tcp:4100
```

실행:

```bash
cd apps/mobile
pnpm start
pnpm android
# iOS 시뮬레이터: pnpm ios
```

```bash
pnpm --filter @kis/mobile typecheck
pnpm --filter @kis/mobile lint
```

실제 기기에서 Google OAuth를 사용하려면 localhost 대신 HTTPS 도메인과 등록된 callback URI가 필요합니다.
