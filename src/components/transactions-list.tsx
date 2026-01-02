'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Edit01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { confirmScheduledTransaction } from '@/app/transactions/actions';
import { toast } from 'sonner';

// Типы для транзакций
export interface Transaction {
  id: string;
  account_id: string;
  category_id: string | null;
  project_id: string | null;
  counterparty_id: string | null;
  amount: number;
  exchange_rate: number;
  converted_amount: number;
  type: 'income' | 'expense' | 'withdrawal';
  tags: string[] | null;
  description: string | null;
  is_scheduled: boolean;
  scheduled_date: string | null;
  created_at: string;
  accounts?: {
    id: string;
    name: string;
    currency: string;
  };
  categories?: {
    id: string;
    name: string;
  } | null;
  projects?: {
    id: string;
    title: string;
  } | null;
  counterparties?: {
    id: string;
    name: string;
  } | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
  formData?: {
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
  };
}

/**
 * Компонент списка транзакций в виде таблицы с группировкой по датам
 */
export function TransactionsList({
  transactions,
  formData,
}: TransactionsListProps) {
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set()
  );
  const [isPending, startTransition] = useTransition();

  // Группировка транзакций по датам
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const dateKey = date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(transaction);
    });

    // Сортируем даты в обратном порядке
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [transactions]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditDialog = () => {
    setEditingTransaction(null);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(transactions.map((t) => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  // Обработчик подтверждения запланированной транзакции
  const handleConfirmScheduled = (transactionId: string) => {
    startTransition(async () => {
      const result = await confirmScheduledTransaction(transactionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Транзакция подтверждена');
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

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получение иконки типа транзакции
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return TrendingUp;
      case 'expense':
        return TrendingDown;
      case 'withdrawal':
        return ArrowLeftRight;
      default:
        return TrendingUp;
    }
  };

  // Получение цвета типа транзакции
  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400';
      case 'expense':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400';
      case 'withdrawal':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400';
    }
  };

  // Вычисление общей суммы выбранных транзакций
  const totalSelectedAmount = useMemo(() => {
    return Array.from(selectedTransactions).reduce((sum, id) => {
      const transaction = transactions.find((t) => t.id === id);
      return sum + (transaction?.amount || 0);
    }, 0);
  }, [selectedTransactions, transactions]);

  const allSelected =
    transactions.length > 0 &&
    selectedTransactions.size === transactions.length;

  if (transactions.length === 0) {
    return (
      <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
        <p className='text-center text-muted-foreground'>
          У вас пока нет транзакций. Создайте первую транзакцию, чтобы начать
          работу.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Заголовок с действиями */}
      <div className='mb-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900'>
        <div className='flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
            <span className='text-sm font-medium'>
              Найдено {transactions.length}{' '}
              {transactions.length === 1
                ? 'транзакция'
                : transactions.length < 5
                ? 'транзакции'
                : 'транзакций'}
            </span>
          </div>
          {selectedTransactions.size > 0 && (
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={selectedTransactions.size !== 1}
                onClick={() => {
                  const selectedId = Array.from(selectedTransactions)[0];
                  const transaction = transactions.find(
                    (t) => t.id === selectedId
                  );
                  if (transaction) {
                    handleEdit(transaction);
                  }
                }}
              >
                Редактировать
              </Button>
              <Button variant='outline' size='sm' disabled>
                Экспорт
              </Button>
              <Button variant='outline' size='sm' disabled>
                Удалить
              </Button>
              <Button variant='outline' size='sm' disabled>
                Устранить дубликаты
              </Button>
            </div>
          )}
        </div>
        {selectedTransactions.size > 0 && (
          <div className='text-right'>
            <div className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
              {formatAmount(
                totalSelectedAmount,
                transactions[0]?.accounts?.currency || 'RUB'
              )}
            </div>
          </div>
        )}
      </div>

      {/* Таблица транзакций */}
      <div className='rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden'>
        <table className='w-full'>
          <tbody>
            {groupedTransactions.map(([dateKey, dateTransactions]) => (
              <React.Fragment key={dateKey}>
                {/* Заголовок даты */}
                <tr className='border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950'>
                  <td
                    colSpan={5}
                    className='px-4 py-4 text-sm font-medium text-zinc-700 dark:text-zinc-300'
                  >
                    {dateKey}
                  </td>
                </tr>
                {/* Транзакции за эту дату */}
                {dateTransactions.map((transaction) => {
                  const Icon = getTransactionIcon(transaction.type);
                  const isSelected = selectedTransactions.has(transaction.id);
                  const isNegative =
                    transaction.type === 'expense' ||
                    transaction.type === 'withdrawal';
                  const isScheduled = transaction.is_scheduled;

                  return (
                    <tr
                      key={transaction.id}
                      className={cn(
                        'border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-950',
                        isSelected && 'bg-emerald-50 dark:bg-emerald-950/20',
                        isScheduled &&
                          'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900'
                      )}
                    >
                      <td className='px-4 py-3'>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectTransaction(
                              transaction.id,
                              checked as boolean
                            )
                          }
                        />
                      </td>
                      <td className='px-4 py-3'>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full',
                            getTransactionTypeColor(transaction.type)
                          )}
                        >
                          <Icon className='h-5 w-5' />
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-col'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium text-zinc-900 dark:text-zinc-50'>
                              {transaction.description ||
                                transaction.categories?.name ||
                                'Без описания'}
                            </span>
                            {/* Лейбл запланированной транзакции */}
                            {isScheduled && (
                              <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300'>
                                <HugeiconsIcon
                                  icon={Calendar01Icon}
                                  size={12}
                                />
                                Запланировано
                              </span>
                            )}
                          </div>
                          {/* Отображение счета, проектов и тегов */}
                          {(transaction.accounts?.name ||
                            transaction.projects?.title ||
                            transaction.tags?.length ||
                            transaction.scheduled_date) && (
                            <div className='mt-1 flex items-center gap-2 flex-wrap'>
                              {/* Счет транзакции */}
                              {transaction.accounts?.name && (
                                <span className='inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300'>
                                  {transaction.accounts.name}
                                </span>
                              )}
                              {/* Проект */}
                              {transaction.projects?.title && (
                                <span className='inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300'>
                                  {transaction.projects.title}
                                </span>
                              )}
                              {/* Дата запланированной транзакции */}
                              {transaction.scheduled_date && (
                                <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                                  <HugeiconsIcon
                                    icon={Calendar01Icon}
                                    size={10}
                                  />
                                  {new Date(
                                    transaction.scheduled_date
                                  ).toLocaleDateString('ru-RU', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              )}
                              {/* Теги */}
                              {transaction.tags?.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className='inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='flex flex-col items-end'>
                          {/* Определяем, была ли транзакция в валюте, отличной от валюты счета */}
                          {transaction.exchange_rate !== 1 &&
                          transaction.exchange_rate !== null ? (
                            // Транзакция в другой валюте: показываем converted_amount как основную сумму
                            <>
                              <span
                                className={cn(
                                  'font-medium',
                                  isNegative
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {isNegative ? '-' : '+'}
                                {formatAmount(
                                  Math.abs(transaction.converted_amount || 0),
                                  transaction.accounts?.currency || 'RUB'
                                )}
                              </span>
                              <span className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                {/* Определяем исходную валюту транзакции */}(
                                {formatAmount(
                                  Math.abs(transaction.amount),
                                  transaction.accounts?.currency === 'RUB'
                                    ? 'USD'
                                    : 'RUB'
                                )}
                                ) • {formatTime(transaction.created_at)}
                              </span>
                            </>
                          ) : (
                            // Транзакция в валюте счета: показываем amount как обычно
                            <>
                              <span
                                className={cn(
                                  'font-medium',
                                  isNegative
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {isNegative ? '-' : '+'}
                                {formatAmount(
                                  Math.abs(transaction.amount),
                                  transaction.accounts?.currency || 'RUB'
                                )}
                              </span>
                              <span className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                {formatTime(transaction.created_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1'>
                          {/* Кнопка подтверждения для запланированных транзакций */}
                          {isScheduled && (
                            <Button
                              variant='default'
                              size='icon'
                              onClick={() =>
                                handleConfirmScheduled(transaction.id)
                              }
                              disabled={isPending}
                              className='h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white'
                              title='Подтвердить транзакцию'
                            >
                              <HugeiconsIcon
                                icon={CheckmarkCircle01Icon}
                                size={16}
                              />
                            </Button>
                          )}
                          {/* Кнопка редактирования */}
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleEdit(transaction)}
                            className='h-8 w-8'
                            title='Редактировать транзакцию'
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модалка редактирования транзакции */}
      <TransactionFormDialog
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
        transaction={editingTransaction}
        formData={formData}
      />
    </>
  );
}
