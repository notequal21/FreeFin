import { requireAuth } from '@/lib/auth';
import { TransactionsTabs } from '@/components/transactions-tabs';

/**
 * Страница транзакций с табами для фильтрации по типам
 * Проверка is_approved выполняется на уровне layout
 */
export default async function TransactionsPage() {
  // Проверяем аутентификацию
  await requireAuth();

  return (
    <div className='container mx-auto p-6'>
      <h1 className='mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Транзакции
      </h1>

      {/* Табы для фильтрации */}
      <TransactionsTabs />
    </div>
  );
}

