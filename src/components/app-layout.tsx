'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';

/**
 * Проверяет, является ли путь страницей авторизации
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

/**
 * Обертка для основного layout приложения
 * Управляет отображением Sidebar в зависимости от страницы
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = isAuthPage(pathname);

  return (
    <div className='flex min-h-screen'>
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all',
          !isAuth && 'ml-64'
        )}
      >
        {children}
      </div>
    </div>
  );
}
