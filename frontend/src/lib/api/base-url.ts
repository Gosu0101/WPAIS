export function getApiBaseUrl(origin?: string) {
  if (!origin) {
    return '/api';
  }

  return `${origin.replace(/\/$/, '')}/api`;
}
