import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TransactionsTabs } from '@/components/transactions-tabs';
import { getTransactionFormData } from './actions';

/**
 * Страница транзакций с табами для фильтрации по типам
 * Проверка is_approved выполняется на уровне layout
 */
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  // Проверяем аутентификацию
  await requireAuth();

  const supabase = await createClient();
  const params = await searchParams;
  const type = params.type as 'income' | 'expense' | 'withdrawal' | undefined;

  // Получаем транзакции с фильтрацией по типу
  let query = supabase
    .from('transactions')
    .select(`
      *,
      accounts:account_id (
        id,
        name,
        currency
      ),
      categories:category_id (
        id,
        name
      ),
      projects:project_id (
        id,
        title
      ),
      counterparties:counterparty_id (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type === 'transfer' ? 'withdrawal' : type);
  }

  const { data: transactions, error } = await query;

  if (error) {
    console.error('Ошибка загрузки транзакций:', error);
  }

  // Получаем данные для формы
  const formDataResult = await getTransactionFormData();

  return (
    <div className='container mx-auto p-6'>
      <h1 className='mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Транзакции
      </h1>

      {/* Табы для фильтрации */}
      <TransactionsTabs
        transactions={transactions || []}
        formData={formDataResult.data}
      />
    </div>
  );
}

