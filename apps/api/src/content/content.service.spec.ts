import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';

const old = new Date('2020-01-01T00:00:00.000Z');

function createPrisma() {
  return {
    subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    article: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
    hourlyBriefing: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
    stock: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('ContentService', () => {
  it('paginates and filters articles while hiding locked fields', async () => {
    const prisma = createPrisma();
    prisma.article.findMany.mockResolvedValue([
      {
        id: 'a1',
        publishedAt: old,
        bodyExcerpt: 'body',
        summary: { bullets: ['summary'] },
        raw: { source: 'private' },
      },
    ]);
    const service = new ContentService(prisma as any);

    const result = await service.getArticles(undefined, { page: '2', kind: 'NEWS' });

    expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.article.findMany).toHaveBeenCalledWith({
      where: { kind: 'NEWS' },
      include: { summary: true },
      orderBy: { publishedAt: 'desc' },
      skip: 20,
      take: 20,
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'a1',
          bodyExcerpt: null,
          summary: null,
          raw: undefined,
          locked: true,
        }),
      ],
      page: 2,
      hasMore: false,
    });
  });

  it('unlocks old articles for an active subscriber', async () => {
    const prisma = createPrisma();
    const article = {
      id: 'a1',
      publishedAt: old,
      bodyExcerpt: 'body',
      summary: { bullets: ['summary'] },
      raw: { source: 'private' },
    };
    prisma.subscription.findFirst.mockResolvedValue({ id: 's1' } as any);
    prisma.article.findUnique.mockResolvedValue(article as any);
    const service = new ContentService(prisma as any);

    const result = await service.getArticle('a1', 'u1');

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'ACTIVE', endsAt: { gt: expect.any(Date) } },
    });
    expect(result).toEqual({ ...article, raw: undefined, locked: false });
  });

  it('throws NotFoundException for a missing article', async () => {
    const service = new ContentService(createPrisma() as any);

    await expect(service.getArticle('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns only briefing preview fields when content is locked', async () => {
    const prisma = createPrisma();
    prisma.hourlyBriefing.findMany.mockResolvedValue([
      {
        id: 'b1',
        bucketAt: old,
        headline: 'headline',
        marketImpact: 'private impact',
        _count: { articles: 3 },
      } as any,
    ]);
    const service = new ContentService(prisma as any);

    const result = await service.getBriefings();

    expect(result.items).toEqual([{ id: 'b1', bucketAt: old, headline: 'headline', locked: true, articleCount: 3 }]);
  });

  it('builds dashboard stock names and sentiment', async () => {
    const prisma = createPrisma();
    prisma.subscription.findFirst.mockResolvedValue({ id: 's1' } as any);
    prisma.hourlyBriefing.findMany.mockResolvedValue([
      {
        id: 'b1',
        bucketAt: old,
        headline: 'headline',
        marketImpact: 'impact',
        watchStocks: ['005930', 'UNKNOWN', 123],
        articles: [
          { article: { summary: { sentiment: 'POSITIVE' } } },
          { article: { summary: { sentiment: 'POSITIVE' } } },
          { article: { summary: { sentiment: 'NEGATIVE' } } },
        ],
      } as any,
    ]);
    prisma.stock.findMany.mockResolvedValue([{ code: '005930', name: '삼성전자' }] as any);
    const service = new ContentService(prisma as any);

    const result = await service.getDashboard('u1');

    expect(prisma.stock.findMany).toHaveBeenCalledWith({ where: { code: { in: ['005930', 'UNKNOWN'] } } });
    expect(result.latest).toEqual(
      expect.objectContaining({
        watchStocks: [
          { code: '005930', name: '삼성전자' },
          { code: 'UNKNOWN', name: 'UNKNOWN' },
        ],
        sentiment: '긍정',
        positivePercent: 67,
        locked: false,
      }),
    );
  });

  it('does not query stocks for a locked briefing detail', async () => {
    const prisma = createPrisma();
    prisma.hourlyBriefing.findUnique.mockResolvedValue({
      id: 'b1',
      bucketAt: old,
      headline: 'headline',
      marketImpact: 'private impact',
      watchStocks: ['005930'],
      articles: [],
    } as any);
    const service = new ContentService(prisma as any);

    await expect(service.getBriefing('b1')).resolves.toEqual({
      id: 'b1',
      bucketAt: old,
      headline: 'headline',
      locked: true,
    });
    expect(prisma.stock.findMany).not.toHaveBeenCalled();
  });
});
