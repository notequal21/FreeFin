import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AccountsList } from '@/components/accounts-list';
import { redirect } from 'next/navigation';

/**
 * Страница управления счетами
 * Проверка is_approved выполняется на уровне layout
 */
export default async function AccountsPage() {
  await requireAuth();

  const supabase = await createClient();

  // Получаем список счетов пользователя
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки счетов:', error);
  }

  return (
    <div className='container mx-auto p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
          Счета
        </h1>
      </div>

      <AccountsList accounts={accounts || []} />
    </div>
  );
}
