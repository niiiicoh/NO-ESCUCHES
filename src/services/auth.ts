const auth = { isAdmin: true, mode: 'demo' } as const;
export function useAuth() {
  return auth;
}
