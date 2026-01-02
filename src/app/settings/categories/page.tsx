import { requireAuth, getAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CategoriesList } from '@/components/categories-list';

/**
 * Страница управления категориями в настройках
 * Проверка is_approved выполняется на уровне layout
 */
export default async function CategoriesPage() {
  await requireAuth();

  const supabase = await createClient();
  const auth = await getAuth();

  // Получаем все категории (общие и приватные)
  let categories: Array<{
    id: string;
    name: string;
    type: 'income' | 'expense';
    user_id: string | null;
    created_at: string;
  }> = [];
  if (auth?.user) {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, type, user_id, created_at')
      .or(`user_id.is.null,user_id.eq.${auth.user.id}`)
      .order('name');

    if (error) {
      console.error('Ошибка загрузки категорий:', error);
    } else {
      categories = data || [];
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Категории
      </h1>

      <CategoriesList categories={categories} />
    </div>
  );
}

