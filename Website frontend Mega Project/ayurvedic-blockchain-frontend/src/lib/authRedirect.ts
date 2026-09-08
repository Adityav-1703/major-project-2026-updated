export function postAuthPath(role?: string) {
  if (role === 'farmer' || role === 'admin') return '/dashboard'
  return '/consumer'
}
