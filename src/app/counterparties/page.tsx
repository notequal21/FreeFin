import { requireAuth } from '@/lib/auth';
import { CounterpartiesTabs } from '@/components/counterparties-tabs';
import { getCounterparties } from './actions';

/**
 * Страница управления контрагентами с табами для фильтрации по типам
 * Проверка is_approved выполняется на уровне layout
 */
export default async function CounterpartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  // Проверяем аутентификацию
  await requireAuth();

  // Получаем параметры поиска
  const params = await searchParams;

  // Определяем тип фильтра из URL параметров
  const typeParam = params.type;
  const filterType =
    typeParam === 'clients'
      ? 'client'
      : typeParam === 'contractors'
      ? 'contractor'
      : null;

  // Получаем список контрагентов с учетом фильтра
  const { data: counterparties, error } = await getCounterparties(filterType);

  if (error) {
    console.error('Ошибка загрузки контрагентов:', error);
  }

  return (
    <div className='container mx-auto p-6'>
      <h1 className='mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
        Контрагенты
      </h1>

      {/* Табы для фильтрации */}
      <CounterpartiesTabs counterparties={counterparties || []} />
    </div>
  );
}
