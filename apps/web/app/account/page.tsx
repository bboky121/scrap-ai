'use client';

import { useEffect, useState } from 'react';
import './account.css';

type User = { id: string; email: string; name: string; provider?: string | null };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.32 2.98-7.42Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.54l3.35-2.62Z" />
    <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
  </svg>;
}

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUser() {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' });
      if (!response.ok) throw new Error('로그인 상태를 확인하지 못했습니다.');
      const data = await response.json();
      setUser(data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'API 연결을 확인해주세요.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadUser(); }, []);

  async function demoLogin() {
    setError('');
    const response = await fetch(`${apiUrl}/auth/demo`, { method: 'POST', credentials: 'include' });
    if (!response.ok) return setError('데모 로그인에 실패했습니다.');
    await loadUser();
  }

  async function logout() {
    const response = await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (response.ok) setUser(null); else setError('로그아웃에 실패했습니다.');
  }

  return <main>
    <section className="page-title"><span className="eyebrow">MY ACCOUNT</span><h1>내 계정</h1><p>관심 뉴스와 멤버십을 한곳에서 관리하세요.</p></section>
    {loading ? <section className="account-card account-loading">로그인 상태를 확인하고 있어요.</section> : user ?
      <section className="account-card account-profile">
        <div className="account-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <div className="account-identity"><span>{user.provider === 'google' ? 'GOOGLE ACCOUNT' : 'DEMO ACCOUNT'}</span><h2>{user.name}</h2><p>{user.email}</p></div>
        <button className="account-logout" type="button" onClick={logout}>로그아웃</button>
      </section> :
      <section className="account-card account-login">
        <div className="account-login-copy"><span className="account-kicker">WELCOME</span><h2>간편하게 시작하세요</h2><p>Google 계정으로 로그인하면 구독과 과거 브리핑 접근 권한이 안전하게 저장됩니다.</p></div>
        <div className="account-actions">
          <a className="google-login" href={`${apiUrl}/auth/google`}><GoogleIcon /><span>Google로 계속하기</span></a>
          <div className="account-divider"><span>또는</span></div>
          <button className="demo-login" type="button" onClick={demoLogin}>포트폴리오 데모로 둘러보기</button>
          <small>로그인 시 서비스 이용을 위한 이메일과 프로필 정보만 사용합니다.</small>
        </div>
      </section>}
    {error && <p className="account-error" role="alert">{error}</p>}
  </main>;
}
