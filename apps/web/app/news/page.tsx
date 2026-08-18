'use client';

import { useEffect, useMemo, useState } from 'react';

import './empty-state.css';

const fallback = [
  {
    id: '1',
    kind: 'NEWS',
    title: '반도체 수출 호조에 코스피 상승 기대',
    provider: '한국투자증권',
    publishedAt: new Date().toISOString(),
    locked: false,
    summary: { keywords: ['반도체', '수출', '코스피'], sentiment: 'POSITIVE' },
  },
  {
    id: '2',
    kind: 'DISCLOSURE',
    title: 'A기업 신규 공급계약 체결 공시',
    provider: '한국투자증권',
    publishedAt: new Date().toISOString(),
    locked: false,
    summary: { keywords: ['공급계약', '공시'], sentiment: 'NEUTRAL' },
  },
];
const filters = [
  ['ALL', '전체'],
  ['NEWS', '뉴스'],
  ['DISCLOSURE', '공시'],
  ['MARKET_COMMENTARY', '시황'],
] as const;
const sentimentLabel: Record<string, string> = { POSITIVE: '긍정', NEGATIVE: '부정', NEUTRAL: '중립' };

export default function News() {
  const [items, setItems] = useState<any[]>(fallback);
  const [filter, setFilter] = useState('ALL');
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100'}/articles`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => data.items.length && setItems(data.items))
      .catch(() => {});
  }, []);
  const visible = useMemo(
    () => (filter === 'ALL' ? items : items.filter((item) => item.kind === filter)),
    [items, filter],
  );
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  return (
    <main>
      <section className="page-title">
        <span className="eyebrow">KIS NEWS FEED</span>
        <h1>국내 증권 뉴스</h1>
        <p>매시간 수집한 시황과 공시를 빠르게 훑어보세요.</p>
      </section>
      <div className="filters">
        {filters.map(([value, label]) => (
          <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      <section className="news-list">
        {visible.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <span>⌁</span>
            </div>
            <h2>아직 수집된 시황이 없어요</h2>
            <p>KIS에서 새로운 시황이 들어오면 다음 정시 수집 후 이곳에 표시됩니다.</p>
            <button type="button" onClick={() => setFilter('ALL')}>
              전체 뉴스 보기
            </button>
          </div>
        )}
        {visible.map((item) => (
          <article className="news-row" key={item.id}>
            <div className="news-icon">
              {item.locked ? '🔒' : item.kind === 'DISCLOSURE' ? '공' : item.kind === 'MARKET_COMMENTARY' ? '시' : 'N'}
            </div>
            <div>
              <div className="meta">
                <span>{item.provider}</span>
                <span>{formatter.format(new Date(item.publishedAt))}</span>
              </div>
              <h3>{item.title}</h3>
              {item.locked ? (
                <p>72시간이 지난 브리핑은 멤버십으로 확인할 수 있어요.</p>
              ) : (
                <p>
                  {item.summary?.keywords?.length
                    ? `핵심 키워드 · ${item.summary.keywords.join(' · ')}  |  시장 신호 · ${sentimentLabel[item.summary.sentiment] ?? '중립'}`
                    : '분석을 준비하고 있어요.'}
                </p>
              )}
            </div>
            <span className="arrow">›</span>
          </article>
        ))}
      </section>
    </main>
  );
}
