import { requireAuth } from "@/lib/auth";

/**
 * Страница добавления дохода
 * Проверка is_approved выполняется на уровне layout
 */
export default async function IncomePage() {
  await requireAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Добавить доход
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Форма добавления дохода будет здесь
      </p>
    </div>
  );
}

