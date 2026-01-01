import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AccountDetails } from '@/components/account-details';
import { notFound, redirect } from 'next/navigation';

/**
 * Страница детального просмотра счета
 * Проверка is_approved выполняется на уровне layout
 */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;
  const supabase = await createClient();

  // Получаем данные счета
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (accountError || !account) {
    notFound();
  }

  // Получаем транзакции для этого счета
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', id)
    .order('created_at', { ascending: false });

  if (transactionsError) {
    console.error('Ошибка загрузки транзакций:', transactionsError);
  }

  return (
    <AccountDetails
      account={account}
      transactions={transactions || []}
    />
  );
}

