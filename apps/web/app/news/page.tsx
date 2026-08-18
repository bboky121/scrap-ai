'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './empty-state.css';
import './infinite-scroll.css';

type Filter = 'ALL' | 'NEWS' | 'DISCLOSURE' | 'MARKET_COMMENTARY';
type Article = {
  id: string;
  kind: Exclude<Filter, 'ALL'>;
  title: string;
  provider: string;
  publishedAt: string;
  locked: boolean;
  summary?: { keywords?: string[]; sentiment?: string } | null;
};

const filters: ReadonlyArray<readonly [Filter, string]> = [
  ['ALL', '전체'],
  ['NEWS', '뉴스'],
  ['DISCLOSURE', '공시'],
  ['MARKET_COMMENTARY', '시황'],
];
const filterLabel: Record<Filter, string> = {
  ALL: '뉴스',
  NEWS: '뉴스',
  DISCLOSURE: '공시',
  MARKET_COMMENTARY: '시황',
};
const sentimentLabel: Record<string, string> = { POSITIVE: '긍정', NEGATIVE: '부정', NEUTRAL: '중립' };
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';

export default function News() {
  const [items, setItems] = useState<Article[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (nextPage: number, selected: Filter, replace = false) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(nextPage) });
      if (selected !== 'ALL') query.set('kind', selected);
      const response = await fetch(`${apiUrl}/articles?${query}`, { credentials: 'include' });
      if (!response.ok) throw new Error('뉴스를 불러오지 못했습니다.');
      const data = (await response.json()) as { items: Article[]; hasMore: boolean };
      setItems((current) => {
        if (replace) return data.items;
        const known = new Set(current.map((item) => item.id));
        return [...current, ...data.items.filter((item) => !known.has(item.id))];
      });
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    void loadPage(1, filter, true);
  }, [filter, loadPage]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && !error) void loadPage(page + 1, filter);
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [error, filter, hasMore, loadPage, loading, page]);

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
        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <span>⌁</span>
            </div>
            <h2>아직 수집된 {filterLabel[filter]}가 없어요</h2>
            <p>KIS에서 새로운 소식이 들어오면 다음 정시 수집 후 이곳에 표시됩니다.</p>
            {filter !== 'ALL' && (
              <button type="button" onClick={() => setFilter('ALL')}>
                전체 뉴스 보기
              </button>
            )}
          </div>
        )}
        {items.map((item) => (
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
                    ? `핵심 키워드 · ${item.summary.keywords.join(' · ')}  |  시장 신호 · ${sentimentLabel[item.summary.sentiment ?? 'NEUTRAL'] ?? '중립'}`
                    : '분석을 준비하고 있어요.'}
                </p>
              )}
            </div>
            <span className="arrow">›</span>
          </article>
        ))}
        <div ref={sentinel} className="scroll-sentinel" aria-hidden="true" />
        {loading && (
          <div className="news-loading" role="status">
            <span />
            <p>{page === 1 ? '뉴스를 불러오고 있어요' : '이전 뉴스를 더 불러오고 있어요'}</p>
          </div>
        )}
        {error && (
          <div className="news-load-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => void loadPage(page, filter, page === 1)}>
              다시 시도
            </button>
          </div>
        )}
        {!loading && !error && !hasMore && items.length > 0 && (
          <div className="news-end">
            <span>✓</span>
            <p>모든 뉴스를 확인했어요</p>
          </div>
        )}
      </section>
    </main>
  );
}
