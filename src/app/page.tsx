import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Dashboard } from "@/components/dashboard";

/**
 * Главная страница (дашборд) с проверкой аутентификации
 * Если пользователь не залогинен, он будет автоматически перенаправлен на /auth
 * Проверка is_approved выполняется на уровне layout
 */
export default async function Home() {
  // Проверяем аутентификацию - если не залогинен, произойдет редирект на /auth
  await requireAuth();

  const supabase = await createClient();

  // Получаем данные пользователя
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Получаем профиль пользователя для primary_currency и default_exchange_rate
  const { data: profile } = await supabase
    .from("profiles")
    .select("primary_currency, default_exchange_rate")
    .eq("id", user.id)
    .maybeSingle();

  const primaryCurrency = profile?.primary_currency || "RUB";
  const defaultExchangeRate = profile?.default_exchange_rate || 100;

  // Получаем все счета пользователя
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: false });

  if (accountsError) {
    console.error("Ошибка загрузки счетов:", accountsError);
  }

  // Получаем последние 10 проектов
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
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
    .order("created_at", { ascending: false })
    .limit(10);

  if (projectsError) {
    console.error("Ошибка загрузки проектов:", projectsError);
  }

  // Получаем общее количество проектов
  const { count: projectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  // Получаем последние 10 контрагентов
  const { data: counterparties, error: counterpartiesError } = await supabase
    .from("counterparties")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  if (counterpartiesError) {
    console.error("Ошибка загрузки контрагентов:", counterpartiesError);
  }

  // Получаем общее количество контрагентов
  const { count: counterpartiesCount } = await supabase
    .from("counterparties")
    .select("*", { count: "exact", head: true });

  // Получаем последние 10 транзакций
  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
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
      projects:project_id (
        id,
        title
      ),
      counterparties:counterparty_id (
        id,
        name
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (transactionsError) {
    console.error("Ошибка загрузки транзакций:", transactionsError);
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Дашборд
      </h1>
      <Dashboard
        accounts={accounts || []}
        projects={projects || []}
        projectsCount={projectsCount || 0}
        counterparties={counterparties || []}
        counterpartiesCount={counterpartiesCount || 0}
        transactions={transactions || []}
        primaryCurrency={primaryCurrency}
        defaultExchangeRate={defaultExchangeRate}
      />
    </div>
  );
}
