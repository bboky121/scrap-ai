import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { isContentLocked } from './domain/content-access';
import { ArticleQueryDto } from './dto/article-query.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  private async isSubscribed(userId?: string) {
    if (!userId) return false;
    return !!(await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE', endsAt: { gt: new Date() } },
    }));
  }

  private articleView(article: any, paid: boolean) {
    const locked = isContentLocked(article.publishedAt, paid);
    return {
      ...article,
      bodyExcerpt: locked ? null : article.bodyExcerpt,
      summary: locked ? null : article.summary,
      raw: undefined,
      locked,
    };
  }

  async getArticles(userId: string | undefined, query: ArticleQueryDto = {}) {
    const page = query.page ?? '1';
    const kind = query.kind;
    const paid = await this.isSubscribed(userId);
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

  async getArticle(id: string, userId?: string) {
    const row = await this.prisma.article.findUnique({ where: { id }, include: { summary: true } });
    if (!row) throw new NotFoundException();
    return this.articleView(row, await this.isSubscribed(userId));
  }

  async getBriefings(userId?: string) {
    const paid = await this.isSubscribed(userId);
    const rows = await this.prisma.hourlyBriefing.findMany({
      orderBy: { bucketAt: 'desc' },
      take: 24,
      include: { _count: { select: { articles: true } } },
    });
    return {
      items: rows.map((row) =>
        isContentLocked(row.bucketAt, paid)
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

  async getDashboard(userId?: string) {
    const paid = await this.isSubscribed(userId);
    const rows = await this.prisma.hourlyBriefing.findMany({
      orderBy: { bucketAt: 'desc' },
      take: 3,
      include: { articles: { include: { article: { include: { summary: true } } } } },
    });
    const allCodes = rows.flatMap((row) =>
      Array.isArray(row.watchStocks)
        ? row.watchStocks.filter((value): value is string => typeof value === 'string')
        : [],
    );
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
      const locked = isContentLocked(row.bucketAt, paid);
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

  async getBriefing(id: string, userId?: string) {
    const row = await this.prisma.hourlyBriefing.findUnique({
      where: { id },
      include: { articles: { include: { article: { include: { summary: true } } } } },
    });
    if (!row) throw new NotFoundException();
    const locked = isContentLocked(row.bucketAt, await this.isSubscribed(userId));
    if (locked) return { id: row.id, bucketAt: row.bucketAt, headline: row.headline, locked: true };

    const watchStocks = Array.isArray(row.watchStocks)
      ? row.watchStocks.filter((value): value is string => typeof value === 'string')
      : [];
    const stocks = watchStocks.length ? await this.prisma.stock.findMany({ where: { code: { in: watchStocks } } }) : [];
    return {
      ...row,
      watchStocks: watchStocks.map((code) => ({
        code,
        name: stocks.find((stock) => stock.code === code)?.name ?? code,
      })),
      locked: false,
    };
  }
}
