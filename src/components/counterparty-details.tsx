'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { CounterpartyFormDialog } from '@/components/counterparty-form-dialog';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { deleteCounterparty } from '@/app/counterparties/actions';
import {
  getTransactionFormData,
  confirmScheduledTransaction,
} from '@/app/transactions/actions';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Edit01Icon,
  ArrowLeftIcon,
  Delete01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/components/transactions-list';

interface Counterparty {
  id: string;
  name: string;
  type: 'client' | 'contractor';
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  budget: number | null;
  currency: 'USD' | 'RUB' | null;
  created_at: string;
}

interface CounterpartyDetailsProps {
  counterparty: Counterparty;
  transactions: Transaction[];
  projects: Project[];
  primaryCurrency: 'USD' | 'RUB';
  defaultExchangeRate: number;
}

/**
 * Компонент детального просмотра контрагента
 */
export function CounterpartyDetails({
  counterparty,
  transactions,
  projects,
  primaryCurrency,
  defaultExchangeRate,
}: CounterpartyDetailsProps) {
  const router = useRouter();
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

  const TypeIcon = counterparty.type === 'client' ? Users : Briefcase;
  const typeLabel = counterparty.type === 'client' ? 'Клиент' : 'Подрядчик';

  // Рассчитываем статистику по контрагенту с конвертацией в primary_currency
  // Логика конвертации:
  // - amount - сумма в валюте транзакции (если exchange_rate !== 1, то валюта транзакции != валюте счета)
  // - exchange_rate - курс от валюты транзакции к валюте счета (primary_currency)
  // - converted_amount = amount * exchange_rate - сумма в валюте счета (primary_currency)
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
        transaction.exchange_rate !== 1 && 
        transaction.exchange_rate !== null;
      
      // Валюта транзакции определяется так:
      // - Если exchange_rate === 1, то валюта транзакции = валюта счета
      // - Если exchange_rate !== 1, то валюта транзакции противоположна валюте счета
      const transactionCurrency = isTransactionInDifferentCurrency
        ? (accountCurrency === 'RUB' ? 'USD' : 'RUB')
        : accountCurrency;
      
      let amountInPrimaryCurrency: number;
      
      if (primaryCurrency === transactionCurrency) {
        // Случай 1: primary_currency совпадает с валютой транзакции
        // Используем amount напрямую (сумма уже в нужной валюте)
        amountInPrimaryCurrency = transaction.amount;
      } else {
        // Случай 2: primary_currency отличается от валюты транзакции
        // Нужно конвертировать из валюты транзакции в primary_currency
        // Используем default_exchange_rate для конвертации
        if (transactionCurrency === 'USD' && primaryCurrency === 'RUB') {
          // Конвертируем USD -> RUB: умножаем на курс (сколько рублей за доллар)
          amountInPrimaryCurrency = transaction.amount * defaultExchangeRate;
        } else if (transactionCurrency === 'RUB' && primaryCurrency === 'USD') {
          // Конвертируем RUB -> USD: делим на курс (сколько рублей за доллар)
          amountInPrimaryCurrency = transaction.amount / defaultExchangeRate;
        } else {
          // Если валюты не совпадают с ожидаемыми, используем amount
          // (это не должно происходить, но на всякий случай)
          amountInPrimaryCurrency = transaction.amount;
        }
      }

      if (transaction.type === 'income') {
        acc.income += amountInPrimaryCurrency;
      } else if (transaction.type === 'expense') {
        acc.expense += amountInPrimaryCurrency;
      }
      // withdrawal не учитываем в статистике

      return acc;
    },
    { income: 0, expense: 0 }
  );

  const profit = stats.income - stats.expense;

  // Рассчитываем дебиторку и кредиторку для контрагента из запланированных транзакций
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
        transaction.exchange_rate !== 1 && 
        transaction.exchange_rate !== null;
      
      const transactionCurrency = isTransactionInDifferentCurrency
        ? (accountCurrency === 'RUB' ? 'USD' : 'RUB')
        : accountCurrency;
      
      let amountInPrimaryCurrency: number;
      
      if (primaryCurrency === transactionCurrency) {
        // Случай 1: primary_currency совпадает с валютой транзакции
        amountInPrimaryCurrency = transaction.amount;
      } else {
        // Случай 2: primary_currency отличается от валюты транзакции
        if (transactionCurrency === 'USD' && primaryCurrency === 'RUB') {
          // Конвертируем USD -> RUB: умножаем на курс
          amountInPrimaryCurrency = transaction.amount * defaultExchangeRate;
        } else if (transactionCurrency === 'RUB' && primaryCurrency === 'USD') {
          // Конвертируем RUB -> USD: делим на курс
          amountInPrimaryCurrency = transaction.amount / defaultExchangeRate;
        } else {
          amountInPrimaryCurrency = transaction.amount;
        }
      }

      if (transaction.type === 'income') {
        acc.receivables += amountInPrimaryCurrency;
      } else if (transaction.type === 'expense') {
        acc.payables += amountInPrimaryCurrency;
      }

      return acc;
    },
    { receivables: 0, payables: 0 }
  );

  // Добавляем к дебиторке разницу между бюджетом проекта и доходами по нему
  // Если у проекта указан бюджет и доходы меньше бюджета, разница добавляется в дебиторку
  const budgetReceivables = projects.reduce((acc, project) => {
    // Проверяем, что у проекта указан бюджет и валюта
    if (project.budget === null || !project.currency) {
      return acc;
    }

    // Считаем сумму доходов по проекту (только подтвержденные транзакции)
    const projectIncome = transactions.reduce((sum, transaction) => {
      // Учитываем только доходы, связанные с этим проектом, и только подтвержденные транзакции
      if (
        transaction.project_id !== project.id ||
        transaction.type !== 'income' ||
        transaction.is_scheduled
      ) {
        return sum;
      }

      // Получаем валюту счета транзакции
      const accountCurrency = transaction.accounts?.currency || 'RUB';
      
      // Определяем валюту транзакции
      const isTransactionInDifferentCurrency = 
        transaction.exchange_rate !== 1 && 
        transaction.exchange_rate !== null;
      
      const transactionCurrency = isTransactionInDifferentCurrency
        ? (accountCurrency === 'RUB' ? 'USD' : 'RUB')
        : accountCurrency;

      // Конвертируем сумму дохода в валюту проекта
      let amountInProjectCurrency: number;

      if (project.currency === transactionCurrency) {
        // Валюта проекта совпадает с валютой транзакции
        amountInProjectCurrency = transaction.amount;
      } else {
        // Валюта проекта отличается от валюты транзакции
        // Используем defaultExchangeRate для конвертации
        if (transactionCurrency === 'USD' && project.currency === 'RUB') {
          // Конвертируем USD -> RUB: умножаем на курс
          amountInProjectCurrency = transaction.amount * defaultExchangeRate;
        } else if (transactionCurrency === 'RUB' && project.currency === 'USD') {
          // Конвертируем RUB -> USD: делим на курс
          amountInProjectCurrency = transaction.amount / defaultExchangeRate;
        } else {
          amountInProjectCurrency = transaction.amount;
        }
      }

      return sum + amountInProjectCurrency;
    }, 0);

    // Если доходы меньше бюджета, добавляем разницу к дебиторке
    if (projectIncome < project.budget) {
      const difference = project.budget - projectIncome;
      
      // Конвертируем разницу в primary_currency
      let differenceInPrimaryCurrency: number;
      
      if (primaryCurrency === project.currency) {
        // Валюта проекта совпадает с primary_currency
        differenceInPrimaryCurrency = difference;
      } else {
        // Валюта проекта отличается от primary_currency
        if (project.currency === 'USD' && primaryCurrency === 'RUB') {
          // Конвертируем USD -> RUB: умножаем на курс
          differenceInPrimaryCurrency = difference * defaultExchangeRate;
        } else if (project.currency === 'RUB' && primaryCurrency === 'USD') {
          // Конвертируем RUB -> USD: делим на курс
          differenceInPrimaryCurrency = difference / defaultExchangeRate;
        } else {
          differenceInPrimaryCurrency = difference;
        }
      }

      return acc + differenceInPrimaryCurrency;
    }

    return acc;
  }, 0);

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

  // Обработчик удаления контрагента
  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteCounterparty(counterparty.id);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsDeleting(false);
    } else {
      toast.success('Контрагент удален');
      router.push('/counterparties');
    }
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

  // Функция для форматирования суммы транзакции
  const formatAmount = (amount: number, currency: 'USD' | 'RUB') => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: currency,
    });
  };

  // Функция для получения цвета типа транзакции
  const getTransactionTypeColor = (type: 'income' | 'expense' | 'withdrawal') => {
    switch (type) {
      case 'income':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'expense':
        return 'text-red-600 dark:text-red-400';
      case 'withdrawal':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-zinc-600 dark:text-zinc-400';
    }
  };

  // Функция для получения текста типа транзакции
  const getTransactionTypeLabel = (type: 'income' | 'expense' | 'withdrawal') => {
    switch (type) {
      case 'income':
        return 'Доход';
      case 'expense':
        return 'Расход';
      case 'withdrawal':
        return 'Вывод';
      default:
        return type;
    }
  };

  return (
    <>
      <div className="container mx-auto p-6">
        {/* Заголовок с кнопками */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/counterparties">
              <Button variant="ghost" size="icon">
                <HugeiconsIcon icon={ArrowLeftIcon} size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {counterparty.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {typeLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <HugeiconsIcon icon={Edit01Icon} size={16} className="mr-2" />
              Редактировать
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <HugeiconsIcon icon={Delete01Icon} size={16} className="mr-2" />
              Удалить
            </Button>
          </div>
        </div>

        {/* Информация о контрагенте */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Транзакций</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Проектов</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{projects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Дата создания</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {new Date(counterparty.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Статистика по контрагенту */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Доходы</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.income.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: primaryCurrency,
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Расходы</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {stats.expense.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: primaryCurrency,
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-semibold ${
                  profit >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {profit.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: primaryCurrency,
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Дебиторка и кредиторка */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Дебиторка</CardTitle>
              <CardDescription className="text-xs">
                Запланированные доходы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {totalReceivables.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: primaryCurrency,
                })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Кредиторка</CardTitle>
              <CardDescription className="text-xs">
                Запланированные расходы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {payables.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: primaryCurrency,
                })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Проекты */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Проекты</CardTitle>
            <CardDescription>
              Проекты, связанные с этим контрагентом
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Нет проектов, связанных с этим контрагентом
              </p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-900/50 dark:hover:border-emerald-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {project.title}
                        </p>
                        <div className="mt-1 flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                          {project.budget !== null && project.currency && (
                            <span>
                              Бюджет:{' '}
                              {project.budget.toLocaleString('ru-RU', {
                                style: 'currency',
                                currency: project.currency,
                              })}
                            </span>
                          )}
                          <span>
                            Создан:{' '}
                            {new Date(project.created_at).toLocaleDateString('ru-RU', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Транзакции */}
        <Card>
          <CardHeader>
            <CardTitle>Транзакции</CardTitle>
            <CardDescription>
              Все транзакции, связанные с этим контрагентом
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Нет транзакций для этого контрагента
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Дата
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Тип
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Сумма
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Счет
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Категория
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Проект
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Описание
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => {
                      const isScheduled = transaction.is_scheduled;
                      return (
                        <tr
                          key={transaction.id}
                          className={cn(
                            'border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors',
                            isScheduled &&
                              'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900'
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {new Date(transaction.created_at).toLocaleDateString('ru-RU', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              {/* Дата запланированной транзакции (только для неподтвержденных) */}
                              {transaction.scheduled_date && isScheduled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-950 dark:text-amber-400 w-fit">
                                  <HugeiconsIcon icon={Calendar01Icon} size={10} />
                                  {new Date(transaction.scheduled_date).toLocaleDateString(
                                    'ru-RU',
                                    {
                                      day: 'numeric',
                                      month: 'short',
                                    }
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${getTransactionTypeColor(
                                  transaction.type
                                )}`}
                              >
                                {getTransactionTypeLabel(transaction.type)}
                              </span>
                              {/* Лейбл запланированной транзакции */}
                              {isScheduled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                  <HugeiconsIcon icon={Calendar01Icon} size={12} />
                                  Запланировано
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-sm font-medium ${getTransactionTypeColor(
                                transaction.type
                              )}`}
                            >
                              {transaction.accounts && (transaction.accounts.currency === 'USD' || transaction.accounts.currency === 'RUB')
                                ? formatAmount(transaction.amount, transaction.accounts.currency as 'USD' | 'RUB')
                                : transaction.amount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {transaction.accounts?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {transaction.categories?.name || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {transaction.projects ? (
                              <Link
                                href={`/projects/${transaction.projects.id}`}
                                className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                              >
                                {transaction.projects.title}
                              </Link>
                            ) : (
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {transaction.description || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {/* Кнопка подтверждения для запланированных транзакций */}
                              {isScheduled && (
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() =>
                                    handleConfirmScheduled(transaction.id)
                                  }
                                  disabled={isPending}
                                  className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Подтвердить транзакцию"
                                >
                                  <HugeiconsIcon
                                    icon={CheckmarkCircle01Icon}
                                    size={16}
                                  />
                                </Button>
                              )}
                              {/* Кнопка редактирования */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditTransaction(transaction)}
                                className="h-8 w-8"
                                title="Редактировать транзакцию"
                              >
                                <HugeiconsIcon icon={Edit01Icon} size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модалка редактирования контрагента */}
      <CounterpartyFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        counterparty={counterparty}
      />

      {/* Модалка подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить контрагента?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить контрагента &quot;{counterparty.name}&quot;?
              Это действие нельзя отменить. Все связанные транзакции и проекты останутся,
              но связь с контрагентом будет удалена.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
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
          transaction={{
            ...editingTransaction,
            accounts: editingTransaction.accounts ?? undefined,
            categories: editingTransaction.categories ?? undefined,
            projects: editingTransaction.projects ?? undefined,
          }}
          formData={transactionFormData}
        />
      )}
    </>
  );
}

