export const ADMIN_PASSWORD = 'PalatePen2026!';

export function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === ADMIN_PASSWORD;
}
