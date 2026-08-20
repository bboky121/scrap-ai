import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3100';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4100';
const allowedHost = new URL(webUrl).host;
const apiHost = new URL(apiUrl).host;

export default function App() {
  const ref = useRef<any>(null);
  const NativeWebView = WebView as any;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ref.current) {
        ref.current.goBack();
        return true;
      }
      return false;
    });
    let unsubscribe: (() => void) | undefined;
    const deepLinkSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith('kisbrief://auth/callback')) ref.current?.reload();
    });
    (async () => {
      try {
        await messaging().requestPermission();
        const token = await messaging().getToken();
        await fetch(`${apiUrl}/devices/push-token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, platform: Platform.OS, appVersion: '0.1.0' }),
        });
        unsubscribe = messaging().onMessage(async () => undefined);
        messaging().onNotificationOpenedApp((message) => {
          const id = message.data?.briefingId;
          if (id) ref.current?.injectJavaScript(`window.location.href='/briefing/${id}'; true;`);
        });
        const initial = await messaging().getInitialNotification();
        const id = initial?.data?.briefingId;
        if (id) ref.current?.injectJavaScript(`window.location.href='/briefing/${id}'; true;`);
      } catch {
        /* permission and token errors should not block reading the web app */
      }
    })();
    return () => {
      back.remove();
      unsubscribe?.();
      deepLinkSubscription.remove();
    };
  }, []);
  if (failed)
    return (
      <SafeAreaView style={styles.center}>
        <Text>서비스에 연결할 수 없습니다.</Text>
        <Text onPress={() => setFailed(false)} style={styles.retry}>
          다시 시도
        </Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={styles.root}>
      <NativeWebView
        ref={ref}
        source={{ uri: webUrl }}
        originWhitelist={['*']}
        javaScriptEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onError={() => setFailed(true)}
        onShouldStartLoadWithRequest={(request: { url: string }) => {
          const url = new URL(request.url);
          if (url.protocol === 'kisbrief:') return true;
          if (url.host === apiHost && url.pathname === '/auth/google') {
            url.searchParams.set('client', 'mobile');
            void Linking.openURL(url.toString());
            return false;
          }
          return url.host === allowedHost;
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  retry: { color: '#2878ff', fontWeight: '700' },
});
