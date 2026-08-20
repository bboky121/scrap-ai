'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Briefing = {
  id: string;
  bucketAt: string;
  headline: string;
  marketImpact: string | null;
  articleCount: number;
  watchStocks: Array<{ code: string; name: string }>;
  sentiment: '긍정' | '중립' | '부정';
  positivePercent: number;
  locked: boolean;
};
type Dashboard = { latest: Briefing | null; recent: Briefing[] };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
const time = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

export default function Home() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/dashboard`, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error('dashboard request failed');
        return response.json() as Promise<Dashboard>;
      })
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const latest = data?.latest;
  return (
    <main>
      <section className="hero">
        <div className="eyebrow">매시간 업데이트{latest ? ` · ${time(latest.bucketAt)} 기준` : ''}</div>
        <h1>
          복잡한 증권 뉴스,
          <br />
          <em>핵심만 빠르게.</em>
        </h1>
        <p>
          한국투자증권의 국내 시황과 공시를 모아
          <br />
          읽기 쉬운 브리핑으로 정리해드려요.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/news">
            최신 뉴스 보기
          </Link>
          <Link className="button ghost" href="/pricing">
            멤버십 알아보기
          </Link>
        </div>
      </section>

      <section className="panel briefing">
        {error ? (
          <div className="home-message">
            <span className="pill">연결 오류</span>
            <h2>브리핑을 불러오지 못했어요</h2>
            <p>잠시 후 새로고침해 주세요.</p>
          </div>
        ) : !data ? (
          <div className="home-message">
            <span className="pill">불러오는 중</span>
            <h2>최신 브리핑을 정리하고 있어요</h2>
          </div>
        ) : !latest ? (
          <div className="home-message">
            <span className="pill">AI BRIEF</span>
            <h2>아직 생성된 브리핑이 없어요</h2>
            <p>다음 정시 수집이 끝나면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <>
            <div>
              <span className="pill">AI BRIEF · {time(latest.bucketAt)}</span>
              <h2>{latest.headline}</h2>
              <p>{latest.marketImpact ?? '72시간이 지난 브리핑은 멤버십 가입 후 볼 수 있어요.'}</p>
            </div>
            <div className="stats">
              <div>
                <b>{latest.articleCount}</b>
                <span>수집 뉴스</span>
              </div>
              <div>
                <b className="positive">{latest.positivePercent}%</b>
                <span>긍정 신호</span>
              </div>
              <div>
                <b>{latest.watchStocks.length}</b>
                <span>관련 종목</span>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="section-head">
        <div>
          <span className="eyebrow">HOURLY BRIEFING</span>
          <h2>시간대별 브리핑</h2>
        </div>
        <Link href="/news">전체 보기 →</Link>
      </section>
      <section className="cards">
        {data?.recent.map((item) => (
          <Link className="card" href={`/briefing/${item.id}`} key={item.id}>
            <div className="card-top">
              <span>{time(item.bucketAt)}</span>
              <span className={`mood ${item.sentiment === '긍정' ? 'positive' : ''}`}>{item.sentiment}</span>
            </div>
            <small>시간별 AI 브리핑</small>
            <h3>{item.headline}</h3>
            <p>{item.marketImpact ?? '멤버십 전용 브리핑입니다.'}</p>
            <div className="card-foot">
              <span>관련 뉴스 {item.articleCount}개</span>
              <span>읽기 →</span>
            </div>
          </Link>
        ))}
        {data && data.recent.length === 0 && <div className="home-empty">수집된 시간대별 브리핑이 없습니다.</div>}
      </section>
    </main>
  );
}
