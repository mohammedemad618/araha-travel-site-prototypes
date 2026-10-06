import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/login', '/setup', '/api/public', '/icon.svg', '/suspended'];

// Cheap gate: requests without a session cookie go to the sign-in page. The
// session itself is validated on the server for every page and action.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const headers = new Headers(req.headers);
  headers.set('x-pathname', pathname);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isPublic && !req.cookies.get('nerp_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
