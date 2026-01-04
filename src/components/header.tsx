import { getAuth } from '@/lib/auth';
import { UserMenu } from '@/components/user-menu';
import { AddTransactionButton } from '@/components/add-transaction-button';

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
          <AddTransactionButton />
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
