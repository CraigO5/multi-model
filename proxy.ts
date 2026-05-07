import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in',
});

export const config = {
  // /chat is intentionally unprotected — trial users can access it
  matcher: [],
};
