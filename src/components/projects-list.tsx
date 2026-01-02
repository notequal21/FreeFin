'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectFormDialog } from '@/components/project-form-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon } from '@hugeicons/core-free-icons';

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
  };

  const handleCloseEditDialog = () => {
    setEditingProject(null);
  };

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Добавить проект
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
          counterparty_id: editingProject.counterparty_id,
        } : null}
      />
    </>
  );
}

