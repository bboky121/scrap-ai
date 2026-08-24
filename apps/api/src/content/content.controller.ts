import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ContentService } from './content.service';
import { ArticleQueryDto } from './dto/article-query.dto';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('articles')
  articles(@Req() req: Request, @Query() query: ArticleQueryDto = {}) {
    return this.content.getArticles(req.session.userId, query);
  }

  @Get('articles/:id')
  article(@Req() req: Request, @Param('id') id: string) {
    return this.content.getArticle(id, req.session.userId);
  }

  @Get('briefings')
  briefings(@Req() req: Request) {
    return this.content.getBriefings(req.session.userId);
  }

  @Get('dashboard')
  dashboard(@Req() req: Request) {
    return this.content.getDashboard(req.session.userId);
  }

  @Get('briefings/:id')
  briefing(@Req() req: Request, @Param('id') id: string) {
    return this.content.getBriefing(id, req.session.userId);
  }
}
