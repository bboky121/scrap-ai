declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport-strategy';
  export class Strategy extends PassportStrategy {
    constructor(
      options: { clientID: string; clientSecret?: string; callbackURL: string },
      verify: (...args: any[]) => any,
    );
  }
}
