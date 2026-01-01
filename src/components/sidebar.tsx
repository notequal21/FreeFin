'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Wallet01Icon,
  Settings01Icon,
  Folder01Icon,
  User02Icon,
} from '@hugeicons/core-free-icons';
import { TransactionIcon } from '@hugeicons/core-free-icons';

/**
 * Проверяет, является ли путь страницей авторизации
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

/**
 * Навигационные ссылки для сайдбара
 */
const navItems = [
  {
    title: 'Главная',
    href: '/',
    icon: Home01Icon,
  },
  {
    title: 'Счета',
    href: '/accounts',
    icon: Wallet01Icon,
  },
  {
    title: 'Проекты',
    href: '/projects',
    icon: Folder01Icon,
  },
  {
    title: 'Контрагенты',
    href: '/counterparties',
    icon: User02Icon,
  },
  {
    title: 'Транзакции',
    href: '/transactions',
    icon: TransactionIcon,
  },
  {
    title: 'Настройки',
    href: '/settings',
    icon: Settings01Icon,
  },
];

/**
 * Компонент сайдбара приложения
 * Содержит навигацию, переключатель темы и версионирование
 * Скрывается на страницах авторизации
 */
export function Sidebar() {
  const pathname = usePathname();

  // Скрываем сайдбар на страницах авторизации
  if (isAuthPage(pathname)) {
    return null;
  }

  return (
    <aside className='fixed left-0 top-0 z-40 h-screen w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black'>
      <div className='flex h-full flex-col'>
        {/* Логотип/Заголовок */}
        <div className='flex h-16 items-center border-b border-zinc-200 px-6 dark:border-zinc-800'>
          <h2 className='text-lg font-semibold text-zinc-900 dark:text-zinc-50'>
            FreeFin
          </h2>
        </div>

        {/* Навигация */}
        <nav className='flex-1 space-y-1 px-3 py-4'>
          {navItems.map((item) => {
            // Для транзакций активна ссылка, если путь начинается с /transactions
            const isActive =
              item.href === '/transactions'
                ? pathname.startsWith('/transactions')
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50'
                )}
              >
                <HugeiconsIcon icon={item.icon} size={20} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Нижняя часть: тема и версия */}
        <div className='border-t border-zinc-200 p-4 dark:border-zinc-800'>
          {/* Переключатель темы */}
          <div className='mb-4 flex items-center justify-center'>
            <ThemeToggle />
          </div>

          {/* Версионирование */}
          <div className='text-center'>
            <p className='text-xs text-zinc-500 dark:text-zinc-400'>
              Версия 0.1.0
            </p>
            <p className='mt-1 text-xs text-zinc-400 dark:text-zinc-500'>
              © 2026 FreeFin
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
