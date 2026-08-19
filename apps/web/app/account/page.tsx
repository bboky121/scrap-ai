'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authChangedEvent } from '../account-nav';
import './account.css';

type User = { id: string; email: string; name: string; provider?: string | null };
type Subscription = {
  id: string;
  planCode: 'WEEK' | 'MONTH' | 'YEAR';
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  canceledAt?: string | null;
  plan: { name: string; price: number };
};
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.32 2.98-7.42Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.54l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  async function loadUser() {
    try {
      const response = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' });
      if (!response.ok) throw new Error('로그인 상태를 확인하지 못했습니다.');
      const data = await response.json();
      setUser(data.user);
      if (data.user) {
        const subscriptionResponse = await fetch(`${apiUrl}/subscriptions/me`, { credentials: 'include' });
        if (!subscriptionResponse.ok) throw new Error('구독 정보를 불러오지 못했습니다.');
        const subscriptionData = (await subscriptionResponse.json()) as { subscription: Subscription | null };
        setSubscription(subscriptionData.subscription);
      } else {
        setSubscription(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'API 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUser();
    void fetch(`${apiUrl}/auth/providers`)
      .then((response) => (response.ok ? response.json() : { google: false }))
      .then((providers: { google?: boolean }) => setGoogleEnabled(Boolean(providers.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function demoLogin() {
    setError('');
    const response = await fetch(`${apiUrl}/auth/demo`, { method: 'POST', credentials: 'include' });
    if (!response.ok) return setError('데모 로그인에 실패했습니다.');
    await loadUser();
    window.dispatchEvent(new Event(authChangedEvent));
  }

  async function logout() {
    const response = await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (response.ok) {
      setUser(null);
      setSubscription(null);
      window.dispatchEvent(new Event(authChangedEvent));
    } else setError('로그아웃에 실패했습니다.');
  }

  async function cancelSubscription() {
    if (!subscription || !subscription.autoRenew) return;
    const confirmed = window.confirm(
      `구독 자동 갱신을 취소할까요? 환불은 진행되지 않으며 ${formatDate(subscription.endsAt)}까지 계속 이용할 수 있습니다.`,
    );
    if (!confirmed) return;

    setCanceling(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/subscriptions/me/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('구독 취소에 실패했습니다.');
      const canceled = (await response.json()) as Partial<Subscription>;
      setSubscription((current) => (current ? { ...current, ...canceled, autoRenew: false } : null));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '구독 취소 중 문제가 발생했습니다.');
    } finally {
      setCanceling(false);
    }
  }

  return (
    <main>
      <section className="page-title">
        <span className="eyebrow">MY ACCOUNT</span>
        <h1>내 계정</h1>
        <p>관심 뉴스와 멤버십을 한곳에서 관리하세요.</p>
      </section>
      {loading ? (
        <section className="account-card account-loading">로그인 상태를 확인하고 있어요.</section>
      ) : user ? (
        <div className="account-dashboard">
          <section className="account-card account-profile">
            <div className="account-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div className="account-identity">
              <span>{user.provider === 'google' ? 'GOOGLE ACCOUNT' : 'DEMO ACCOUNT'}</span>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
            <button className="account-logout" type="button" onClick={logout}>
              로그아웃
            </button>
          </section>

          <section className="account-card subscription-card">
            <div className="subscription-heading">
              <div>
                <span className="account-kicker">MEMBERSHIP</span>
                <h2>구독 정보</h2>
              </div>
              {subscription && (
                <span className={subscription.autoRenew ? 'subscription-status active' : 'subscription-status ending'}>
                  {subscription.autoRenew ? '자동 갱신 중' : '기간 종료 예정'}
                </span>
              )}
            </div>

            {subscription ? (
              <>
                <dl className="subscription-details">
                  <div>
                    <dt>이용 중인 멤버십</dt>
                    <dd>{subscription.plan.name}</dd>
                  </div>
                  <div>
                    <dt>구독 시작일</dt>
                    <dd>{formatDate(subscription.startsAt)}</dd>
                  </div>
                  <div>
                    <dt>구독 종료일</dt>
                    <dd>{formatDate(subscription.endsAt)}</dd>
                  </div>
                </dl>
                <div className="subscription-action">
                  <div>
                    <strong>
                      {subscription.autoRenew ? '자동 갱신을 중단하시겠어요?' : '자동 갱신이 취소되었습니다.'}
                    </strong>
                    <p>
                      {subscription.autoRenew
                        ? '취소해도 환불되지 않으며, 현재 구독 종료일까지 모든 혜택을 이용할 수 있습니다.'
                        : `${formatDate(subscription.endsAt)}까지 이용할 수 있으며 이후 추가 결제되지 않습니다.`}
                    </p>
                  </div>
                  {subscription.autoRenew && (
                    <button
                      className="subscription-cancel"
                      type="button"
                      onClick={cancelSubscription}
                      disabled={canceling}
                    >
                      {canceling ? '처리 중…' : '구독 취소'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="subscription-empty">
                <p>현재 이용 중인 멤버십이 없습니다.</p>
                <Link className="button" href="/pricing">
                  멤버십 둘러보기
                </Link>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="account-card account-login">
          <div className="account-login-copy">
            <span className="account-kicker">WELCOME</span>
            <h2>간편하게 시작하세요</h2>
            <p>Google 계정으로 로그인하면 구독과 과거 브리핑 접근 권한이 안전하게 저장됩니다.</p>
          </div>
          <div className="account-actions">
            {googleEnabled && (
              <>
                <a className="google-login" href={`${apiUrl}/auth/google`}>
                  <GoogleIcon />
                  <span>Google로 계속하기</span>
                </a>
                <div className="account-divider">
                  <span>또는</span>
                </div>
              </>
            )}
            <button className="demo-login" type="button" onClick={demoLogin}>
              포트폴리오 데모로 둘러보기
            </button>
            <small>
              {googleEnabled
                ? '로그인 시 서비스 이용을 위한 이메일과 프로필 정보만 사용합니다.'
                : '현재 Google 로그인이 설정되지 않아 데모 로그인을 이용할 수 있습니다.'}
            </small>
          </div>
        </section>
      )}
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
