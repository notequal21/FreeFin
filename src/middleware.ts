import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware для установки заголовка с pathname
 * Это позволяет использовать pathname в Server Components
 */
export function middleware(request: NextRequest) {
  // Создаем копию заголовков запроса
  const requestHeaders = new Headers(request.headers);

  // Устанавливаем заголовок с pathname для использования в Server Components
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  // Возвращаем ответ с обновленными заголовками
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Настройка matcher для middleware
// Применяем ко всем маршрутам, кроме статических файлов и API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
