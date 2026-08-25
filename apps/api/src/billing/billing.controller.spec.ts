import { BillingController } from './billing.controller';

describe('BillingController', () => {
  it('passes the authenticated user and payment request to BillingService', async () => {
    const billing: any = { pay: jest.fn().mockResolvedValue({ payment: { id: 'p1' } }) };
    const controller = new BillingController(billing);
    const body: any = { planCode: 'WEEK', result: 'success' };

    await controller.pay({ session: { userId: 'u1' } } as any, body);

    expect(billing.pay).toHaveBeenCalledWith('u1', body);
  });
});
