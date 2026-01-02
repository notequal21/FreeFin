'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteCategory } from '@/app/settings/categories/actions';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon, Delete01Icon } from '@hugeicons/core-free-icons';
import { ArrowUpCircle, ArrowDownCircle, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  user_id: string | null; // null для общих категорий
  created_at: string;
}

interface CategoriesListProps {
  categories: Category[];
}

/**
 * Компонент списка категорий с возможностью создания, редактирования и удаления
 * Пользователь может управлять только своими приватными категориями (user_id = auth.uid())
 */
export function CategoriesList({ categories }: CategoriesListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleEdit = (category: Category) => {
    // Можно редактировать только свои приватные категории
    if (category.user_id === null) {
      toast.error('Невозможно редактировать', {
        description: 'Общие категории нельзя редактировать',
      });
      return;
    }
    setEditingCategory(category);
  };

  const handleCloseEditDialog = () => {
    setEditingCategory(null);
  };

  const handleDelete = (category: Category) => {
    // Можно удалять только свои приватные категории
    if (category.user_id === null) {
      toast.error('Невозможно удалить', {
        description: 'Общие категории нельзя удалять',
      });
      return;
    }
    setDeletingCategory(category);
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;

    const result = await deleteCategory(deletingCategory.id);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
    } else {
      toast.success('Категория удалена');
      setDeletingCategory(null);
    }
  };

  // Функция для получения иконки типа категории
  const getTypeIcon = (type: 'income' | 'expense') => {
    return type === 'income' ? ArrowUpCircle : ArrowDownCircle;
  };

  // Функция для получения текста типа категории
  const getTypeLabel = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Доход' : 'Расход';
  };

  // Разделяем категории на общие и приватные
  const privateCategories = categories.filter((cat) => cat.user_id !== null);
  const commonCategories = categories.filter((cat) => cat.user_id === null);

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Создать категорию
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              У вас пока нет категорий. Создайте первую категорию, чтобы начать работу.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Приватные категории */}
          {privateCategories.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Мои категории</CardTitle>
                <CardDescription>
                  Ваши приватные категории, которые можно редактировать и удалять
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Название
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Тип
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Дата создания
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {privateCategories.map((category) => {
                        const TypeIcon = getTypeIcon(category.type);
                        return (
                          <tr
                            key={category.id}
                            className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                              {category.name}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {getTypeLabel(category.type)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                              {new Date(category.created_at).toLocaleDateString('ru-RU', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(category)}
                                  className="h-8 w-8"
                                >
                                  <HugeiconsIcon icon={Edit01Icon} size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(category)}
                                  className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <HugeiconsIcon icon={Delete01Icon} size={16} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Общие категории */}
          {commonCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Общие категории</CardTitle>
                <CardDescription>
                  Общие категории, доступные всем пользователям. Их нельзя редактировать или удалять.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Название
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Тип
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {commonCategories.map((category) => {
                        const TypeIcon = getTypeIcon(category.type);
                        return (
                          <tr
                            key={category.id}
                            className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {category.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                  {getTypeLabel(category.type)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Модалка создания категории */}
      <CategoryFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Модалка редактирования категории */}
      <CategoryFormDialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
        category={editingCategory}
      />

      {/* Модалка подтверждения удаления */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить категорию &quot;{deletingCategory?.name}&quot;?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

