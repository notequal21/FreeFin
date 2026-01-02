import { requireAuth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProjectsList } from '@/components/projects-list';

/**
 * Страница управления проектами
 * Проверка is_approved выполняется на уровне layout
 */
export default async function ProjectsPage() {
  await requireAuth();

  const supabase = await createClient();

  // Получаем список проектов пользователя с информацией о контрагентах
  const { data: projects, error } = await supabase
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
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ошибка загрузки проектов:', error);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Проекты
        </h1>
      </div>

      <ProjectsList projects={projects || []} />
    </div>
  );
}

