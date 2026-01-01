import { getAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserMenu } from '@/components/user-menu';

/**
 * Компонент хедера приложения
 * Отображает профиль пользователя и кнопки быстрых действий
 */
export async function Header() {
  // Получаем данные пользователя (без редиректа, если не залогинен)
  const auth = await getAuth();

  // Если пользователь не залогинен, не показываем хедер
  if (!auth) {
    return null;
  }

  const { profile, user } = auth;
  const displayName =
    profile?.full_name || user.email?.split('@')[0] || 'Пользователь';

  return (
    <header className='sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-800 dark:bg-black/95 dark:supports-[backdrop-filter]:bg-black/60'>
      <div className='container flex h-16 items-center justify-between px-4'>
        {/* Кнопки быстрых действий */}
        <div className='flex items-center gap-2'>
          <Button
            asChild
            variant='default'
            size='sm'
            className='bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
          >
            <Link href='/transactions/income'>Доход</Link>
          </Button>
          <Button
            asChild
            variant='default'
            size='sm'
            className='bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
          >
            <Link href='/transactions/expense'>Расход</Link>
          </Button>
          <Button
            asChild
            variant='default'
            size='sm'
            className='bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
          >
            <Link href='/transactions/transfer'>Перевод</Link>
          </Button>
        </div>

        {/* Профиль пользователя с дропдауном */}
        <UserMenu
          displayName={displayName}
          primaryCurrency={profile?.primary_currency}
        />
      </div>
    </header>
  );
}
