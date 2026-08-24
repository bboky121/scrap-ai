export function briefingNotification(hour: string, articleCount: number) {
  return {
    title: '시그널브리프',
    body: `${hour}시 브리핑 ${articleCount}건입니다.`,
  };
}
