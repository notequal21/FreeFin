'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Settings01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { LogOut } from 'lucide-react';

/**
 * Пропсы для компонента меню пользователя
 */
interface UserMenuProps {
  displayName: string;
  primaryCurrency?: string;
}

/**
 * Компонент меню пользователя с дропдауном
 * Содержит ссылку на настройки и кнопку выхода
 */
export function UserMenu({ displayName, primaryCurrency }: UserMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Обработчик выхода из аккаунта
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Ошибка выхода', {
          description: error.message,
        });
        return;
      }

      toast.success('Вы вышли из аккаунта');
      // Перенаправляем на страницу авторизации
      router.push('/auth');
      router.refresh();
    } catch (error) {
      toast.error('Ошибка', {
        description: 'Не удалось выйти из аккаунта',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex items-center gap-3 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-900'
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white'>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className='flex flex-col items-start'>
            <span className='text-sm font-medium text-zinc-900 dark:text-zinc-50'>
              {displayName}
            </span>
            {primaryCurrency && (
              <span className='text-xs text-zinc-500 dark:text-zinc-400'>
                {primaryCurrency}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>
          <div className='flex flex-col'>
            <span className='font-medium'>{displayName}</span>
            {primaryCurrency && (
              <span className='text-xs font-normal text-zinc-500 dark:text-zinc-400'>
                Валюта: {primaryCurrency}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href='/settings' className='flex items-center gap-2 w-full'>
            <HugeiconsIcon icon={Settings01Icon} size={16} />
            <span>Настройки</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className='text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400'
        >
          <LogOut className='mr-2 h-4 w-4' />
          {isLoggingOut ? 'Выход...' : 'Выйти'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

