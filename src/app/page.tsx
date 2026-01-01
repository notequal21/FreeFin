import { requireAuth } from "@/lib/auth";

/**
 * Главная страница с проверкой аутентификации
 * Если пользователь не залогинен, он будет автоматически перенаправлен на /auth
 * Проверка is_approved выполняется на уровне layout
 */
export default async function Home() {
  // Проверяем аутентификацию - если не залогинен, произойдет редирект на /auth
  await requireAuth();

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Добро пожаловать в FreeFin!
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Здесь будет главная страница с обзором финансов
      </p>
    </div>
  );
}
