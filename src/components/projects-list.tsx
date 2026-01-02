'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectFormDialog } from '@/components/project-form-dialog';
import { getCompletedProjects, toggleProjectCompletion } from '@/app/projects/actions';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon, Archive01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

interface Counterparty {
  id: string;
  name: string;
  type: 'client' | 'contractor' | null;
}

interface Project {
  id: string;
  title: string;
  budget: number | null;
  currency: 'USD' | 'RUB' | null;
  counterparty_id: string | null;
  created_at: string;
  counterparties: Counterparty | null;
}

interface ProjectsListProps {
  projects: Project[];
}

/**
 * Компонент списка проектов с возможностью создания и редактирования
 */
export function ProjectsList({ projects }: ProjectsListProps) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCompletedProjectsDialogOpen, setIsCompletedProjectsDialogOpen] = useState(false);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleCloseEditDialog = () => {
    setEditingProject(null);
  };

  // Загрузка завершенных проектов
  const loadCompletedProjects = async () => {
    setIsLoadingCompleted(true);
    const result = await getCompletedProjects();
    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
    } else if (result.data) {
      setCompletedProjects(result.data);
    }
    setIsLoadingCompleted(false);
  };

  // Обработчик открытия модалки завершенных проектов
  const handleOpenCompletedProjects = () => {
    setIsCompletedProjectsDialogOpen(true);
    if (completedProjects.length === 0) {
      loadCompletedProjects();
    }
  };

  // Обработчик возврата проекта из завершенных
  const handleRestoreProject = async (projectId: string) => {
    startTransition(async () => {
      const result = await toggleProjectCompletion(projectId, false);
      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Проект возвращен в активные');
        // Обновляем список завершенных проектов
        loadCompletedProjects();
        // Обновляем страницу
        router.refresh();
      }
    });
  };

  // Форматирование суммы
  const formatAmount = (amount: number, currency: string) => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: currency,
    });
  };

  return (
    <>
      <div className="mb-4 flex gap-2">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Добавить проект
        </Button>
        <Button variant="outline" onClick={handleOpenCompletedProjects}>
          <HugeiconsIcon icon={Archive01Icon} size={16} className="mr-2" />
          Завершенные проекты
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              У вас пока нет проектов. Создайте первый проект, чтобы начать работу.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-1">{project.title}</CardTitle>
                    {project.budget !== null && project.currency && (
                      <CardDescription>
                        Бюджет: {project.budget.toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: project.currency,
                        })}
                      </CardDescription>
                    )}
                    {project.counterparties && (
                      <CardDescription className={project.budget !== null && project.currency ? 'mt-1' : ''}>
                        Контрагент: {project.counterparties.name}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(project)}
                    className="h-8 w-8"
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="outline" className="w-full">
                    Открыть проект
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модалка создания проекта */}
      <ProjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Модалка редактирования проекта */}
      <ProjectFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
        project={editingProject ? {
          id: editingProject.id,
          title: editingProject.title,
          budget: editingProject.budget,
          currency: editingProject.currency,
          exchange_rate: (editingProject as any).exchange_rate ?? null,
          counterparty_id: editingProject.counterparty_id,
        } : null}
      />

      {/* Модалка завершенных проектов */}
      <Dialog open={isCompletedProjectsDialogOpen} onOpenChange={setIsCompletedProjectsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Завершенные проекты</DialogTitle>
            <DialogDescription>
              Список всех завершенных проектов. Вы можете вернуть проект в активные.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {isLoadingCompleted ? (
              <p className="text-center text-muted-foreground py-4">
                Загрузка...
              </p>
            ) : completedProjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Нет завершенных проектов
              </p>
            ) : (
              completedProjects.map((completedProject) => (
                <Card key={completedProject.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                          {completedProject.title}
                        </div>
                        {completedProject.budget !== null && completedProject.currency && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                            Бюджет: {formatAmount(completedProject.budget, completedProject.currency)}
                          </div>
                        )}
                        {completedProject.counterparties && (
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                            Контрагент: {completedProject.counterparties.name}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(completedProject.created_at).toLocaleDateString('ru-RU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreProject(completedProject.id)}
                        disabled={isPending}
                        className="ml-4"
                      >
                        <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
                        Вернуть
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompletedProjectsDialogOpen(false)}
            >
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

