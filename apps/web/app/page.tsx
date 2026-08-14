import Link from 'next/link';
const demo = [
  {time:'09:00',tag:'시장',title:'반도체 수출 호조, 코스피 상승 기대',desc:'외국인 수급과 대형 반도체주 흐름에 관심이 집중되고 있어요.',mood:'긍정'},
  {time:'08:00',tag:'공시',title:'주요 기업 공급계약·실적 공시 정리',desc:'장 시작 전 확인해야 할 핵심 공시를 한 번에 모았어요.',mood:'중립'},
  {time:'07:00',tag:'시황',title:'오늘 시장을 움직일 세 가지 변수',desc:'환율, 미국 선물, 반도체 업황을 중심으로 살펴보세요.',mood:'중립'},
];
export default async function Home() {
  return <main><section className="hero"><div className="eyebrow">매시간 업데이트 · 09:00 기준</div><h1>복잡한 증권 뉴스,<br/><em>핵심만 빠르게.</em></h1><p>한국투자증권의 국내 시황과 공시를 모아<br/>읽기 쉬운 브리핑으로 정리해드려요.</p><div className="hero-actions"><Link className="button" href="/news">최신 뉴스 보기</Link><Link className="button ghost" href="/pricing">멤버십 알아보기</Link></div></section><section className="panel briefing"><div><span className="pill">AI BRIEF</span><h2>지금 시장은<br/>반도체와 수급을 보고 있어요</h2><p>수출 지표 개선과 외국인 매수세가 대형주에 긍정적으로 작용할 가능성이 있어요. 다만 환율 변동성은 계속 확인할 필요가 있습니다.</p></div><div className="stats"><div><b>12</b><span>수집 뉴스</span></div><div><b className="positive">68%</b><span>긍정 신호</span></div><div><b>5</b><span>관련 종목</span></div></div></section><section className="section-head"><div><span className="eyebrow">HOURLY BRIEFING</span><h2>시간대별 브리핑</h2></div><Link href="/news">전체 보기 →</Link></section><section className="cards">{demo.map((x,i)=><article className="card" key={x.time}><div className="card-top"><span>{x.time}</span><span className={x.mood==='긍정'?'mood positive':'mood'}>{x.mood}</span></div><small>{x.tag}</small><h3>{x.title}</h3><p>{x.desc}</p><div className="card-foot"><span>관련 뉴스 {12-i*3}개</span><span>읽기 →</span></div></article>)}</section></main>;
}
