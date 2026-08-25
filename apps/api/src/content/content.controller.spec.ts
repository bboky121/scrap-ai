import { ContentController } from './content.controller';

describe('ContentController', () => {
  it('passes the session user and query to ContentService', async () => {
    const content: any = { getArticles: jest.fn().mockResolvedValue({ items: [] }) };
    const controller = new ContentController(content);

    await controller.articles({ session: { userId: 'u1' } } as any, { page: '2', kind: 'NEWS' });

    expect(content.getArticles).toHaveBeenCalledWith('u1', { page: '2', kind: 'NEWS' });
  });
});
