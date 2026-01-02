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
import { CounterpartyFormDialog } from '@/components/counterparty-form-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon } from '@hugeicons/core-free-icons';
import { Users, Briefcase } from 'lucide-react';

interface Counterparty {
  id: string;
  name: string;
  type: 'client' | 'contractor';
  created_at: string;
}

interface CounterpartiesListProps {
  counterparties: Counterparty[];
}

/**
 * Компонент списка контрагентов с возможностью создания и редактирования
 */
export function CounterpartiesList({ counterparties }: CounterpartiesListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState<Counterparty | null>(null);

  const handleEdit = (counterparty: Counterparty) => {
    setEditingCounterparty(counterparty);
  };

  const handleCloseEditDialog = () => {
    setEditingCounterparty(null);
  };

  // Функция для получения иконки типа контрагента
  const getTypeIcon = (type: 'client' | 'contractor') => {
    return type === 'client' ? Users : Briefcase;
  };

  // Функция для получения текста типа контрагента
  const getTypeLabel = (type: 'client' | 'contractor') => {
    return type === 'client' ? 'Клиент' : 'Подрядчик';
  };

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Создать контрагента
        </Button>
      </div>

      {counterparties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              У вас пока нет контрагентов. Создайте первого контрагента, чтобы начать работу.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Контрагенты</CardTitle>
            <CardDescription>
              Список всех ваших контрагентов
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
                  {counterparties.map((counterparty) => {
                    const TypeIcon = getTypeIcon(counterparty.type);
                    return (
                      <tr
                        key={counterparty.id}
                        className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/counterparties/${counterparty.id}`}
                            className="font-medium text-zinc-900 dark:text-zinc-50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          >
                            {counterparty.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {getTypeLabel(counterparty.type)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {new Date(counterparty.created_at).toLocaleDateString('ru-RU', {
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
                              onClick={() => handleEdit(counterparty)}
                              className="h-8 w-8"
                            >
                              <HugeiconsIcon icon={Edit01Icon} size={16} />
                            </Button>
                            <Link href={`/counterparties/${counterparty.id}`}>
                              <Button variant="outline" size="sm">
                                Открыть
                              </Button>
                            </Link>
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

      {/* Модалка создания контрагента */}
      <CounterpartyFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Модалка редактирования контрагента */}
      <CounterpartyFormDialog
        open={!!editingCounterparty}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
        counterparty={editingCounterparty}
      />
    </>
  );
}

