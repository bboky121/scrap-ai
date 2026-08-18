import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: '시그널브리프', description: 'KIS 국내 증권 뉴스 브리핑' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header>
          <Link className="brand" href="/">
            <span>●</span> 시그널브리프
          </Link>
          <nav>
            <Link href="/">브리핑</Link>
            <Link href="/news">뉴스</Link>
            <Link href="/pricing">멤버십</Link>
          </nav>
          <Link className="profile" href="/account">
            MY
          </Link>
        </header>
        {children}
        <footer>투자 판단의 책임은 투자자 본인에게 있습니다. · KIS Open API 기반 포트폴리오 데모</footer>
      </body>
    </html>
  );
}
