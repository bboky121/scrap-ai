'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
type Briefing = {
  id: string;
  bucketAt: string;
  headline: string;
  marketImpact?: string;
  keyIssues?: string[];
  watchStocks?: Array<{ code: string; name: string }>;
  locked?: boolean;
  articles?: Array<{
    article: {
      id: string;
      title: string;
      provider: string;
      publishedAt: string;
      summary?: { bullets?: string[] } | null;
    };
  }>;
};

export default function BriefingDetail({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<Briefing | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    params.then(({ id }) =>
      fetch(`${apiUrl}/briefings/${id}`, { credentials: 'include' })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((value) => {
          if (active) setData(value);
        })
        .catch(() => {
          if (active) setError(true);
        }),
    );
    return () => {
      active = false;
    };
  }, [params]);
  if (error)
    return (
      <main>
        <section className="home-message">
          <h2>브리핑을 불러오지 못했어요</h2>
          <Link href="/">홈으로 돌아가기</Link>
        </section>
      </main>
    );
  if (!data)
    return (
      <main>
        <section className="home-message">
          <h2>브리핑을 불러오고 있어요</h2>
        </section>
      </main>
    );
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
  return (
    <main>
      <section className="page-title briefing-title">
        <Link href="/" className="eyebrow">
          ← 홈
        </Link>
        <h1>{data.headline}</h1>
        <p>수집 시각 · {time.format(new Date(data.bucketAt))}</p>
      </section>
      {data.locked ? (
        <section className="panel home-message">
          <h2>멤버십 전용 브리핑입니다.</h2>
          <p>구독 후 전체 요약과 관련 뉴스를 확인할 수 있어요.</p>
          <Link className="button" href="/pricing">
            멤버십 확인
          </Link>
        </section>
      ) : (
        <section className="briefing-detail">
          <div className="briefing-impact">
            <span className="eyebrow">MARKET IMPACT</span>
            <p>{data.marketImpact ?? '이번 시간대 시장에 영향을 줄 주요 흐름을 정리했습니다.'}</p>
          </div>
          <div className="briefing-section">
            <h2>핵심 이슈</h2>
            <ul>
              {(data.keyIssues ?? []).map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
          {(data.watchStocks ?? []).length > 0 && (
            <div className="briefing-section">
              <h2>주목 종목</h2>
              <div className="stock-tags">
                {(data.watchStocks ?? []).map((stock) => (
                  <span key={stock.code}>{stock.name}</span>
                ))}
              </div>
            </div>
          )}
          <div className="briefing-section">
            <h2>
              관련 뉴스 <small>{data.articles?.length ?? 0}건</small>
            </h2>
            {(data.articles ?? []).map(({ article }) => (
              <article className="news-row" key={article.id}>
                <div>
                  <div className="meta">
                    <span>{article.provider}</span>
                    <span>{time.format(new Date(article.publishedAt))}</span>
                  </div>
                  <h3>{article.title}</h3>
                  {article.summary?.bullets?.[0] && <p>{article.summary.bullets[0]}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
