import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProjectDetails } from '@/components/project-details';
import { redirect } from 'next/navigation';

/**
 * Страница деталей проекта
 * Проверка is_approved выполняется на уровне layout
 */
export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;
  const supabase = await createClient();

  // Получаем данные проекта
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      `
      *,
      counterparties:counterparty_id (
        id,
        name,
        type
      )
    `
    )
    .eq('id', id)
    .single();

  if (projectError || !project) {
    redirect('/projects');
  }

  // Получаем транзакции для этого проекта
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select(
      `
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
      counterparties:counterparty_id (
        id,
        name
      )
    `
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (transactionsError) {
    console.error('Ошибка загрузки транзакций:', transactionsError);
  }

  // Получаем primary_currency и default_exchange_rate из профиля пользователя для конвертации валют
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
    <ProjectDetails 
      project={project} 
      transactions={transactions || []} 
      primaryCurrency={primaryCurrency}
      defaultExchangeRate={defaultExchangeRate}
    />
  );
}

