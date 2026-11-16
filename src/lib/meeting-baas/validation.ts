export function validateGoogleMeetUrl(url: string): { isValid: boolean; normalizedUrl: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, normalizedUrl: '', error: 'Google Meet URL is required' };
  }

  const trimmed = url.trim();
  const regex = /^(https?:\/\/)?(meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3})(\?.*)?$/i;
  const match = trimmed.match(regex);

  if (!match) {
    return {
      isValid: false,
      normalizedUrl: trimmed,
      error: 'Invalid Google Meet URL format. Must match https://meet.google.com/xxx-yyyy-zzz',
    };
  }

  const rawPath = match[2];
  const normalizedUrl = `https://${rawPath.toLowerCase()}`;

  return {
    isValid: true,
    normalizedUrl,
  };
}
