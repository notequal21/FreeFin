import { requireAuth } from "@/lib/auth";

/**
 * Страница настроек
 * Проверка is_approved выполняется на уровне layout
 */
export default async function SettingsPage() {
  await requireAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Настройки
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Настройки приложения будут здесь
      </p>
    </div>
  );
}

