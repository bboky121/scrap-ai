'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

export const authChangedEvent = 'signalbrief:auth-changed';

export default function AccountNav() {
  const [loggedIn, setLoggedIn] = useState(false);

  const checkLogin = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' });
      if (!response.ok) return setLoggedIn(false);
      const data = (await response.json()) as { user?: unknown };
      setLoggedIn(Boolean(data.user));
    } catch {
      setLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    void checkLogin();
    window.addEventListener(authChangedEvent, checkLogin);
    return () => window.removeEventListener(authChangedEvent, checkLogin);
  }, [checkLogin]);

  return (
    <Link className={loggedIn ? 'profile' : 'login-link'} href="/account">
      {loggedIn ? 'MY' : '로그인'}
    </Link>
  );
}
