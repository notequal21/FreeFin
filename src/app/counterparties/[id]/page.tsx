import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CounterpartyDetails } from '@/components/counterparty-details';
import { notFound } from 'next/navigation';
import { getCounterparty } from '../actions';

/**
 * Страница детального просмотра контрагента
 * Проверка is_approved выполняется на уровне layout
 */
export default async function CounterpartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;

  // Получаем данные контрагента
  const { data: counterparty, error: counterpartyError } = await getCounterparty(id);

  if (counterpartyError || !counterparty) {
    notFound();
  }

  const supabase = await createClient();

  // Получаем транзакции для этого контрагента
  // Включаем amount, exchange_rate и converted_amount для расчета статистики
  // Включаем is_scheduled и scheduled_date для отображения запланированных транзакций
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(
      `
      id,
      amount,
      exchange_rate,
      converted_amount,
      type,
      description,
      is_scheduled,
      scheduled_date,
      created_at,
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
      )
    `
    )
    .eq('counterparty_id', id)
    .order('created_at', { ascending: false });

  if (transactionsError) {
    console.error('Ошибка загрузки транзакций:', transactionsError);
  }

  // Получаем проекты для этого контрагента
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, title, budget, currency, created_at')
    .eq('counterparty_id', id)
    .order('created_at', { ascending: false });

  if (projectsError) {
    console.error('Ошибка загрузки проектов:', projectsError);
  }

  // Получаем primary_currency и default_exchange_rate из профиля пользователя для отображения статистики
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let primaryCurrency = 'RUB';
  let defaultExchangeRate = 100; // Курс по умолчанию RUB/USD
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_currency, default_exchange_rate')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.primary_currency) {
      primaryCurrency = profile.primary_currency;
    }
    if (profile?.default_exchange_rate) {
      defaultExchangeRate = profile.default_exchange_rate;
    }
  }

  return (
    <CounterpartyDetails
      counterparty={counterparty}
      transactions={transactions || []}
      projects={projects || []}
      primaryCurrency={primaryCurrency}
      defaultExchangeRate={defaultExchangeRate}
    />
  );
}

