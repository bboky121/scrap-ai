import { Controller, Get, NotFoundException, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from './prisma.service';

@Controller()
export class ContentController {
  constructor(private readonly prisma: PrismaService) {}
  private async subscribed(req: Request) {
    if (!req.session.userId) return false;
    return !!(await this.prisma.subscription.findFirst({
      where: { userId: req.session.userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
    }));
  }
  private locked(publishedAt: Date, paid: boolean) {
    return isContentLocked(publishedAt, paid);
  }
  private articleView(article: any, paid: boolean) {
    const locked = this.locked(article.publishedAt, paid);
    return {
      ...article,
      bodyExcerpt: locked ? null : article.bodyExcerpt,
      summary: locked ? null : article.summary,
      raw: undefined,
      locked,
    };
  }

  @Get('articles')
  async articles(@Req() req: Request, @Query('page') page = '1', @Query('kind') kind?: string) {
    const paid = await this.subscribed(req);
    const take = 20;
    const current = Math.max(1, Number(page) || 1);
    const allowedKinds = ['NEWS', 'DISCLOSURE', 'MARKET_COMMENTARY'];
    const where =
      kind && allowedKinds.includes(kind) ? { kind: kind as 'NEWS' | 'DISCLOSURE' | 'MARKET_COMMENTARY' } : undefined;
    const rows = await this.prisma.article.findMany({
      where,
      include: { summary: true },
      orderBy: { publishedAt: 'desc' },
      skip: (current - 1) * take,
      take,
    });
    return { items: rows.map((row) => this.articleView(row, paid)), page: current, hasMore: rows.length === take };
  }

  @Get('articles/:id')
  async article(@Req() req: Request, @Param('id') id: string) {
    const row = await this.prisma.article.findUnique({ where: { id }, include: { summary: true } });
    if (!row) throw new NotFoundException();
    return this.articleView(row, await this.subscribed(req));
  }

  @Get('briefings')
  async briefings(@Req() req: Request) {
    const paid = await this.subscribed(req);
    const rows = await this.prisma.hourlyBriefing.findMany({
      orderBy: { bucketAt: 'desc' },
      take: 24,
      include: { _count: { select: { articles: true } } },
    });
    return {
      items: rows.map((row) =>
        this.locked(row.bucketAt, paid)
          ? {
              id: row.id,
              bucketAt: row.bucketAt,
              headline: row.headline,
              locked: true,
              articleCount: row._count.articles,
            }
          : { ...row, locked: false, articleCount: row._count.articles },
      ),
    };
  }

  @Get('dashboard')
  async dashboard(@Req() req: Request) {
    const paid = await this.subscribed(req);
    const rows = await this.prisma.hourlyBriefing.findMany({
      orderBy: { bucketAt: 'desc' },
      take: 3,
      include: {
        articles: { include: { article: { include: { summary: true } } } },
      },
    });

    const allCodes = rows.flatMap((row) => (Array.isArray(row.watchStocks) ? row.watchStocks.filter((value): value is string => typeof value === 'string') : []));
    const stockRows = allCodes.length ? await this.prisma.stock.findMany({ where: { code: { in: allCodes } } }) : [];
    const stockNames = new Map(stockRows.map((stock) => [stock.code, stock.name]));
    const items = rows.map((row) => {
      const summaries = row.articles.flatMap(({ article }) => (article.summary ? [article.summary] : []));
      const positiveCount = summaries.filter(({ sentiment }) => sentiment === 'POSITIVE').length;
      const negativeCount = summaries.filter(({ sentiment }) => sentiment === 'NEGATIVE').length;
      const watchStocks = Array.isArray(row.watchStocks)
        ? row.watchStocks.filter((value): value is string => typeof value === 'string')
        : [];
      const stocks = watchStocks.map((code) => ({ code, name: stockNames.get(code) ?? code }));
      const locked = this.locked(row.bucketAt, paid);

      return {
        id: row.id,
        bucketAt: row.bucketAt,
        headline: row.headline,
        marketImpact: locked ? null : row.marketImpact,
        articleCount: row.articles.length,
        watchStocks: locked ? [] : stocks,
        sentiment: positiveCount > negativeCount ? '긍정' : negativeCount > positiveCount ? '부정' : '중립',
        positivePercent: summaries.length ? Math.round((positiveCount / summaries.length) * 100) : 0,
        locked,
      };
    });

    return { latest: items[0] ?? null, recent: items };
  }

  @Get('briefings/:id')
  async briefing(@Req() req: Request, @Param('id') id: string) {
    const row = await this.prisma.hourlyBriefing.findUnique({
      where: { id },
      include: { articles: { include: { article: { include: { summary: true } } } } },
    });
    if (!row) throw new NotFoundException();
    const locked = this.locked(row.bucketAt, await this.subscribed(req));
    if (!locked) {
      const watchStocks = Array.isArray(row.watchStocks) ? row.watchStocks.filter((value): value is string => typeof value === 'string') : [];
      const stocks = watchStocks.length ? await this.prisma.stock.findMany({ where: { code: { in: watchStocks } } }) : [];
      return { ...row, watchStocks: watchStocks.map((code) => ({ code, name: stocks.find((stock) => stock.code === code)?.name ?? code })), locked: false };
    }
    return locked
      ? { id: row.id, bucketAt: row.bucketAt, headline: row.headline, locked: true }
      : { ...row, locked: false };
  }
}

export function isContentLocked(publishedAt: Date, paid: boolean, now = new Date()): boolean {
  return !paid && now.getTime() - publishedAt.getTime() >= 72 * 3600_000;
}
