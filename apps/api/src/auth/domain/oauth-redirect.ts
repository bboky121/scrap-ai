export function oauthRedirectDestination(client?: 'web' | 'mobile') {
  return client === 'mobile'
    ? `${process.env.MOBILE_DEEP_LINK_SCHEME ?? 'kisbrief'}://auth/callback`
    : `${process.env.WEB_URL ?? 'http://localhost:3000'}/account`;
}
