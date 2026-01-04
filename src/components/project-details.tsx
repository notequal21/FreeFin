'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectFormDialog } from '@/components/project-form-dialog';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { deleteProject, toggleProjectCompletion } from '@/app/projects/actions';
import { useTransactionDialog } from '@/contexts/transaction-dialog-context';
import {
  getTransactionFormData,
  confirmScheduledTransaction,
} from '@/app/transactions/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Edit01Icon,
  Delete01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Archive01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useTransition } from 'react';
import { Transaction as BaseTransaction } from '@/components/transactions-list';

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
  exchange_rate: number | null;
  counterparty_id: string | null;
  is_completed?: boolean;
  created_at: string;
  counterparties: Counterparty | null;
}

// Расширяем базовый тип Transaction для поддержки project_exchange_rate
interface Transaction extends BaseTransaction {
  project_exchange_rate: number | null;
}

interface ProjectDetailsProps {
  project: Project;
  transactions: Transaction[];
  primaryCurrency: string;
  defaultExchangeRate: number;
}

/**
 * Компонент детального просмотра проекта
 */
export function ProjectDetails({
  project,
  transactions,
  primaryCurrency,
  defaultExchangeRate,
}: ProjectDetailsProps) {
  const router = useRouter();
  const { openDialog: openTransactionDialog } = useTransactionDialog();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [transactionFormData, setTransactionFormData] = useState<{
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
    defaultExchangeRate?: number;
    primaryCurrency?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteProject(project.id);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsDeleting(false);
    } else {
      toast.success('Проект удален');
      router.push('/projects');
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: currency,
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Доход';
      case 'expense':
        return 'Расход';
      case 'withdrawal':
        return 'Перевод';
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'expense':
        return 'text-red-600 dark:text-red-400';
      case 'withdrawal':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return '';
    }
  };

  // Определяем валюту для отображения статистики
  // Используем валюту проекта, если она указана, иначе валюту первой транзакции
  const displayCurrency =
    project.currency || transactions[0]?.accounts?.currency || 'RUB';

  // Рассчитываем статистику проекта с конвертацией в валюту проекта
  // Логика конвертации:
  // - amount - сумма в валюте транзакции (если exchange_rate !== 1, то валюта транзакции != валюте счета)
  // - exchange_rate - курс от валюты транзакции к валюте счета (primary_currency)
  // - converted_amount = amount * exchange_rate - сумма в валюте счета (primary_currency)
  // - project.exchange_rate - курс проекта RUB/USD (сколько рублей за доллар), если указан
  // - default_exchange_rate - курс по умолчанию RUB/USD (сколько рублей за доллар)
  const stats = transactions.reduce(
    (acc, transaction) => {
      // Исключаем запланированные транзакции из статистики
      if (transaction.is_scheduled) {
        return acc;
      }

      // Получаем валюту счета транзакции
      const accountCurrency = transaction.accounts?.currency || 'RUB';

      // Определяем валюту транзакции
      // Если exchange_rate !== 1, то транзакция в валюте, отличной от валюты счета
      const isTransactionInDifferentCurrency =
        transaction.exchange_rate !== 1 && transaction.exchange_rate !== null;

      // Валюта транзакции определяется так:
      // - Если exchange_rate === 1, то валюта транзакции = валюта счета
      // - Если exchange_rate !== 1, то валюта транзакции противоположна валюте счета
      const transactionCurrency = isTransactionInDifferentCurrency
        ? accountCurrency === 'RUB'
          ? 'USD'
          : 'RUB'
        : accountCurrency;

      // Получаем курс проекта (используем курс проекта, если указан, иначе курс по умолчанию)
      const projectExchangeRate = project.exchange_rate || defaultExchangeRate;

      let amountInProjectCurrency: number;

      if (displayCurrency === transactionCurrency) {
        // Случай 1: Валюта проекта совпадает с валютой транзакции
        // Используем amount напрямую (сумма уже в нужной валюте)
        amountInProjectCurrency = transaction.amount;
      } else {
        // Случай 2: Валюта проекта отличается от валюты транзакции
        // Нужно конвертировать из валюты транзакции в валюту проекта
        // Используем сохраненный project_exchange_rate, если он есть (для старых транзакций),
        // иначе используем текущий курс проекта
        const hasSavedExchangeRate =
          transaction.project_exchange_rate !== null &&
          transaction.project_exchange_rate !== undefined;

        // Конвертируем из валюты транзакции в валюту проекта
        if (transactionCurrency === 'USD' && displayCurrency === 'RUB') {
          // Конвертируем USD -> RUB
          if (
            hasSavedExchangeRate &&
            transaction.project_exchange_rate !== null
          ) {
            // project_exchange_rate для USD -> RUB сохраняется как курс "сколько рублей за доллар" (например, 100)
            // Значит нужно умножать
            amountInProjectCurrency =
              transaction.amount * transaction.project_exchange_rate;
          } else {
            // projectExchangeRate - это курс RUB/USD (сколько рублей за доллар, например, 100)
            // Значит нужно умножать
            amountInProjectCurrency = transaction.amount * projectExchangeRate;
          }
        } else if (transactionCurrency === 'RUB' && displayCurrency === 'USD') {
          // Конвертируем RUB -> USD
          if (
            hasSavedExchangeRate &&
            transaction.project_exchange_rate !== null
          ) {
            // project_exchange_rate для RUB -> USD сохраняется как курс "сколько долларов за рубль" (например, 0.01 = 1/100)
            // Значит нужно умножать (так как это уже обратный курс)
            amountInProjectCurrency =
              transaction.amount * transaction.project_exchange_rate;
          } else {
            // projectExchangeRate - это курс RUB/USD (сколько рублей за доллар, например, 100)
            // Значит нужно делить
            amountInProjectCurrency = transaction.amount / projectExchangeRate;
          }
        } else {
          // Если валюты не совпадают с ожидаемыми, используем amount
          // (это не должно происходить, но на всякий случай)
          amountInProjectCurrency = transaction.amount;
        }
      }

      if (transaction.type === 'income') {
        acc.income += amountInProjectCurrency;
      } else if (transaction.type === 'expense') {
        acc.expense += amountInProjectCurrency;
      }
      // withdrawal не учитываем в статистике проекта

      return acc;
    },
    { income: 0, expense: 0 }
  );

  const profit = stats.income - stats.expense;

  // Рассчитываем дебиторку и кредиторку для проекта из запланированных транзакций
  // Дебиторка = запланированные доходы (is_scheduled=true, type='income')
  // Кредиторка = запланированные расходы (is_scheduled=true, type='expense')
  const { receivables, payables } = transactions.reduce(
    (acc, transaction) => {
      // Учитываем только запланированные транзакции
      if (!transaction.is_scheduled) {
        return acc;
      }

      // Получаем валюту счета транзакции
      const accountCurrency = transaction.accounts?.currency || 'RUB';

      // Определяем валюту транзакции
      const isTransactionInDifferentCurrency =
        transaction.exchange_rate !== 1 && transaction.exchange_rate !== null;

      const transactionCurrency = isTransactionInDifferentCurrency
        ? accountCurrency === 'RUB'
          ? 'USD'
          : 'RUB'
        : accountCurrency;

      // Получаем курс проекта (используем курс проекта, если указан, иначе курс по умолчанию)
      const projectExchangeRate = project.exchange_rate || defaultExchangeRate;

      let amountInProjectCurrency: number;

      if (displayCurrency === transactionCurrency) {
        // Валюта проекта совпадает с валютой транзакции
        amountInProjectCurrency = transaction.amount;
      } else {
        // Валюта проекта отличается от валюты транзакции
        // Нужно конвертировать из валюты транзакции в валюту проекта
        if (transactionCurrency === 'USD' && displayCurrency === 'RUB') {
          // Конвертируем USD -> RUB
          amountInProjectCurrency = transaction.amount * projectExchangeRate;
        } else if (transactionCurrency === 'RUB' && displayCurrency === 'USD') {
          // Конвертируем RUB -> USD
          amountInProjectCurrency = transaction.amount / projectExchangeRate;
        } else {
          amountInProjectCurrency = transaction.amount;
        }
      }

      if (transaction.type === 'income') {
        acc.receivables += amountInProjectCurrency;
      } else if (transaction.type === 'expense') {
        acc.payables += amountInProjectCurrency;
      }

      return acc;
    },
    { receivables: 0, payables: 0 }
  );

  // Добавляем к дебиторке разницу между бюджетом проекта и доходами по нему
  // Если у проекта указан бюджет и доходы меньше бюджета, разница добавляется в дебиторку
  let budgetReceivables = 0;
  if (project.budget !== null && project.currency) {
    // Доходы уже посчитаны в stats.income в валюте проекта
    // Если доходы меньше бюджета, добавляем разницу к дебиторке
    if (stats.income < project.budget) {
      budgetReceivables = project.budget - stats.income;
    }
  }

  // Итоговая дебиторка = запланированные доходы + разница между бюджетом и доходами
  const totalReceivables = receivables + budgetReceivables;

  // Загружаем данные для формы транзакции
  useEffect(() => {
    const loadFormData = async () => {
      const result = await getTransactionFormData();
      if (result.data) {
        setTransactionFormData(result.data);
      }
    };
    loadFormData();
  }, []);

  const handleCreateTransaction = (
    type: 'income' | 'expense' | 'withdrawal'
  ) => {
    // Используем глобальный контекст для открытия модалки
    openTransactionDialog({
      defaultType: type,
      defaultProjectId: project.id,
      defaultCounterpartyId: project.counterparty_id,
    });
  };

  // Обработчик редактирования транзакции
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  // Обработчик подтверждения запланированной транзакции
  const handleConfirmScheduled = (transactionId: string) => {
    startTransition(async () => {
      const result = await confirmScheduledTransaction(transactionId);
      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Транзакция подтверждена');
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className='container mx-auto p-6'>
        {/* Кнопка назад */}
        <div className='mb-4'>
          <Button
            variant='ghost'
            onClick={() => router.push('/projects')}
            className='mb-4'
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className='mr-2' />
            Назад к проектам
          </Button>
        </div>

        {/* Заголовок и действия */}
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {project.title}
            </h1>
          </div>
          <div className='flex gap-2'>
            {!project.is_completed && (
              <Button
                variant='outline'
                onClick={async () => {
                  startTransition(async () => {
                    const result = await toggleProjectCompletion(
                      project.id,
                      true
                    );
                    if (result.error) {
                      toast.error('Ошибка', {
                        description: result.error,
                      });
                    } else {
                      toast.success('Проект завершен');
                      router.refresh();
                    }
                  });
                }}
                disabled={isPending}
              >
                <HugeiconsIcon
                  icon={Archive01Icon}
                  size={16}
                  className='mr-2'
                />
                Завершить
              </Button>
            )}
            <Button variant='outline' onClick={() => setIsEditDialogOpen(true)}>
              <HugeiconsIcon icon={Edit01Icon} size={16} className='mr-2' />
              Редактировать
            </Button>
            <Button
              variant='destructive'
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} className='mr-2' />
              Удалить
            </Button>
          </div>
        </div>

        {/* Кнопки создания транзакций */}
        <div className='mb-6 flex flex-wrap gap-2'>
          <Button onClick={() => handleCreateTransaction('income')}>
            Добавить доход
          </Button>
          <Button
            variant='outline'
            onClick={() => handleCreateTransaction('expense')}
          >
            Добавить расход
          </Button>
        </div>

        {/* Информация о проекте */}
        <div className='mb-6 grid gap-4 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Информация о проекте</CardTitle>
              <CardDescription>Основные данные проекта</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Название
                </p>
                <p className='text-lg font-semibold'>{project.title}</p>
              </div>

              {project.budget !== null && project.currency && (
                <div>
                  <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                    Бюджет
                  </p>
                  <p className='text-lg font-semibold'>
                    {formatAmount(project.budget, project.currency)}
                  </p>
                </div>
              )}

              {project.counterparties && (
                <div>
                  <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                    Контрагент
                  </p>
                  <p className='text-lg font-semibold'>
                    {project.counterparties.name}
                    {project.counterparties.type && (
                      <span className='ml-2 text-sm font-normal text-zinc-500'>
                        (
                        {project.counterparties.type === 'client'
                          ? 'Клиент'
                          : 'Подрядчик'}
                        )
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Дата создания
                </p>
                <p className='text-lg font-semibold'>
                  {new Date(project.created_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Статистика проекта */}
          <Card>
            <CardHeader>
              <CardTitle>Статистика проекта</CardTitle>
              <CardDescription>Финансовые показатели</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Доходы
                </p>
                <p className='text-lg font-semibold text-emerald-600 dark:text-emerald-400'>
                  {formatAmount(stats.income, displayCurrency)}
                </p>
              </div>

              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Расходы
                </p>
                <p className='text-lg font-semibold text-red-600 dark:text-red-400'>
                  {formatAmount(stats.expense, displayCurrency)}
                </p>
              </div>

              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Прибыль
                </p>
                <p
                  className={`text-lg font-semibold ${
                    profit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatAmount(profit, displayCurrency)}
                </p>
              </div>

              <div className='pt-2 border-t border-zinc-200 dark:border-zinc-800'>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Дебиторка
                </p>
                <p className='text-lg font-semibold text-emerald-600 dark:text-emerald-400'>
                  {formatAmount(totalReceivables, displayCurrency)}
                </p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                  {budgetReceivables > 0
                    ? 'Запланированные доходы + недополученный бюджет'
                    : 'Запланированные доходы'}
                </p>
              </div>

              <div>
                <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400'>
                  Кредиторка
                </p>
                <p className='text-lg font-semibold text-red-600 dark:text-red-400'>
                  {formatAmount(payables, displayCurrency)}
                </p>
                <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
                  Запланированные расходы
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Список транзакций */}
        <Card>
          <CardHeader>
            <CardTitle>Транзакции</CardTitle>
            <CardDescription>
              Все транзакции, связанные с этим проектом
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className='text-center text-muted-foreground'>
                Транзакций пока нет
              </p>
            ) : (
              <div className='space-y-4'>
                {transactions.map((transaction) => {
                  const isScheduled = transaction.is_scheduled;
                  return (
                    <div
                      key={transaction.id}
                      className={cn(
                        'flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 rounded-lg p-3 transition-colors',
                        isScheduled &&
                          'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900'
                      )}
                    >
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span
                            className={`font-medium ${getTransactionTypeColor(
                              transaction.type
                            )}`}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </span>
                          {/* Лейбл запланированной транзакции */}
                          {isScheduled && (
                            <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300'>
                              <HugeiconsIcon icon={Calendar01Icon} size={12} />
                              Запланировано
                            </span>
                          )}
                          <span className='text-sm text-muted-foreground'>
                            {new Date(
                              transaction.created_at
                            ).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                          {/* Дата запланированной транзакции (только для неподтвержденных) */}
                          {transaction.scheduled_date && isScheduled && (
                            <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                              <HugeiconsIcon icon={Calendar01Icon} size={10} />
                              {new Date(
                                transaction.scheduled_date
                              ).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                        {transaction.description && (
                          <p className='mt-1 text-sm text-muted-foreground'>
                            {transaction.description}
                          </p>
                        )}
                        <div className='mt-1 flex gap-4 text-xs text-muted-foreground'>
                          {transaction.accounts && (
                            <span>Счет: {transaction.accounts.name}</span>
                          )}
                          {transaction.categories && (
                            <span>
                              Категория: {transaction.categories.name}
                            </span>
                          )}
                          {transaction.counterparties && (
                            <span>
                              Контрагент: {transaction.counterparties.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <div className='text-right'>
                          <p
                            className={`font-semibold ${getTransactionTypeColor(
                              transaction.type
                            )}`}
                          >
                            {transaction.type === 'expense' ? '-' : '+'}
                            {formatAmount(
                              transaction.converted_amount ||
                                transaction.amount,
                              transaction.accounts?.currency || 'RUB'
                            )}
                          </p>
                        </div>
                        {/* Кнопки действий */}
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
                            onClick={() => handleEditTransaction(transaction)}
                            className='h-8 w-8'
                            title='Редактировать транзакцию'
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модалка редактирования проекта */}
      <ProjectFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        project={{
          id: project.id,
          title: project.title,
          budget: project.budget,
          currency: project.currency,
          exchange_rate: project.exchange_rate,
          counterparty_id: project.counterparty_id,
          is_completed: project.is_completed,
        }}
      />

      {/* Модалка подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить проект?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить проект &quot;{project.title}&quot;?
              Это действие нельзя отменить. Все связанные транзакции останутся,
              но связь с проектом будет удалена.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модалка редактирования транзакции */}
      {transactionFormData && editingTransaction && (
        <TransactionFormDialog
          open={!!editingTransaction}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTransaction(null);
              // Обновляем страницу после редактирования транзакции
              router.refresh();
            }
          }}
          transaction={editingTransaction}
          formData={transactionFormData}
        />
      )}
    </>
  );
}
