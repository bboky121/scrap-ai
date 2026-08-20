'use client';
import { useEffect, useState } from 'react';
import './pricing.css';
const plans = [
  { code: 'WEEK', name: '1주', price: '3,900', sub: '가볍게 시작하기' },
  { code: 'MONTH', name: '1개월', price: '9,900', sub: '꾸준히 시장 보기', best: true },
  { code: 'YEAR', name: '1년', price: '79,000', sub: '가장 합리적인 선택' },
];
export default function Pricing() {
  const [msg, setMsg] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

  useEffect(() => {
    fetch(`${api}/subscriptions/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { subscription: { endsAt: string } | null }) => {
        setSubscribed(!!data.subscription);
        setEndsAt(data.subscription?.endsAt ?? null);
      })
      .catch(() => {
        setSubscribed(false);
        setEndsAt(null);
      });
  }, [api]);

  async function pay(code: string, result = 'success') {
    const authResponse = await fetch(`${api}/auth/me`, { credentials: 'include' });
    if (!authResponse.ok) {
      setMsg('로그인 상태를 확인하지 못했습니다.');
      return;
    }
    const authData = (await authResponse.json()) as { user: { id: string } | null };
    if (!authData.user) {
      window.location.assign('/account?next=/pricing');
      return;
    }
    const r = await fetch(`${api}/payments/simulate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planCode: code, result, cardLast4: '4242', autoRenew: true }),
    });
    if (!r.ok) {
      setMsg('결제 시뮬레이션에 실패했어요.');
      return;
    }
    const data = (await r.json()) as { subscription?: { endsAt: string } };
    setSubscribed(true);
    setEndsAt(data.subscription?.endsAt ?? null);
    setMsg('가상 결제가 완료됐어요. 과거 브리핑이 열렸습니다.');
  }
  return (
    <main>
      <section className="page-title center">
        <span className="eyebrow">MEMBERSHIP</span>
        <h1>
          필요한 만큼만,
          <br />
          부담 없이 시작하세요
        </h1>
        <p>
          최근 72시간 뉴스는 누구나 무료예요.
          <br />
          지난 브리핑까지 보고 싶을 때 멤버십을 이용하세요.
        </p>
      </section>
      <section className="price-grid">
        {plans.map((plan) => (
          <article className={plan.best ? 'price-card best' : 'price-card'} key={plan.code}>
            {plan.best && <span className="best-label">가장 인기</span>}
            <small>{plan.sub}</small>
            <h2>{plan.name}</h2>
            <div className="price">
              <b>₩{plan.price}</b>
            </div>
            <ul>
              <li>✓ 72시간 이전 뉴스 무제한</li>
              <li>✓ 시간대별 AI 브리핑</li>
              <li>✓ 자동 갱신 언제든 해지</li>
            </ul>
            <button
              className={subscribed ? 'button subscription-button' : 'button'}
              disabled={subscribed}
              onClick={() => pay(plan.code)}
            >
              {subscribed ? '현재 구독 중입니다.' : '가상 결제로 시작하기'}
            </button>
          </article>
        ))}
      </section>
      {msg && <div className="toast">{msg}</div>}
      <p className="payment-note">
        {subscribed && endsAt
          ? `${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(endsAt))}까지 구독이 유지됩니다.`
          : '실제 결제는 발생하지 않는 포트폴리오용 시뮬레이션입니다.'}
      </p>
    </main>
  );
}
