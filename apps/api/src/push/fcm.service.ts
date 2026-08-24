import { Injectable } from '@nestjs/common';
import type { Messaging } from 'firebase-admin/messaging';

type BriefingMessage = {
  token: string;
  title: string;
  body: string;
  briefingId: string;
};

@Injectable()
export class FcmService {
  private messaging?: Messaging;

  isConfigured() {
    return Boolean(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
  }

  async initialize() {
    if (this.messaging) return;
    const [{ cert, getApps, initializeApp }, { getMessaging }] = await Promise.all([
      import('firebase-admin/app'),
      import('firebase-admin/messaging'),
    ]);
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    this.messaging = getMessaging();
  }

  async sendBriefing(message: BriefingMessage) {
    await this.initialize();
    await this.messaging!.send({
      token: message.token,
      notification: { title: message.title, body: message.body },
      data: { type: 'briefing', briefingId: message.briefingId },
    });
  }
}
