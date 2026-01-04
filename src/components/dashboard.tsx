'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { Transaction as TransactionListType, Transaction } from '@/components/transactions-list';
import {
  getTransactionFormData,
  confirmScheduledTransaction,
} from '@/app/transactions/actions';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  Calendar01Icon,
  Edit01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Типы данных
interface Account {
  id: string;
  name: string;
  balance: number;
  currency: 'USD' | 'RUB';
  created_at: string;
}

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
  counterparty_id: string | null;
  created_at: string;
  counterparties: Counterparty | null;
}

// Используем импортированный тип Transaction из transactions-list
// Расширяем его для поддержки массива projects (для совместимости с данными из БД)
type TransactionWithArrayProjects = Omit<Transaction, 'projects'> & {
  projects?: {
    id: string;
    title: string;
    budget?: number | null;
    currency?: 'USD' | 'RUB' | null;
    exchange_rate?: number | null;
  } | null | Array<{
    id: string;
    title: string;
    budget?: number | null;
    currency?: 'USD' | 'RUB' | null;
    exchange_rate?: number | null;
  }>;
};

interface ProjectWithBudget {
  id: string;
  budget: number;
  currency: 'USD' | 'RUB';
  exchange_rate: number | null;
}

interface DashboardProps {
  accounts: Account[];
  projects: Project[];
  projectsCount: number;
  counterparties: Counterparty[];
  counterpartiesCount: number;
  transactions: TransactionWithArrayProjects[];
  scheduledTransactions?: TransactionWithArrayProjects[];
  projectTransactions?: TransactionWithArrayProjects[];
  allProjectsWithBudget?: ProjectWithBudget[];
  primaryCurrency: 'USD' | 'RUB';
  defaultExchangeRate: number;
}

/**
 * Компонент дашборда с общей информацией о финансах
 */
export function Dashboard({
  accounts,
  projects,
  projectsCount,
  counterparties,
  counterpartiesCount,
  transactions,
  scheduledTransactions = [],
  projectTransactions = [],
  allProjectsWithBudget = [],
  primaryCurrency,
  defaultExchangeRate,
}: DashboardProps) {
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithArrayProjects | null>(null);
  const [transactionFormData, setTransactionFormData] = useState<{
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
    defaultExchangeRate?: number;
    primaryCurrency?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

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

  // Обработчик редактирования транзакции
  const handleEditTransaction = (transaction: TransactionWithArrayProjects) => {
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
  // Вычисляем общий баланс в primary_currency
  const totalBalance = accounts.reduce((sum, account) => {
    if (account.currency === primaryCurrency) {
      return sum + account.balance;
    } else {
      // Конвертируем в primary_currency
      // Если primary_currency = RUB, а счет в USD, то умножаем на курс
      // Если primary_currency = USD, а счет в RUB, то делим на курс
      if (primaryCurrency === 'RUB') {
        return sum + account.balance * defaultExchangeRate;
      } else {
        return sum + account.balance / defaultExchangeRate;
      }
    }
  }, 0);

  // Вычисляем общий баланс в USD для отображения
  const totalBalanceUSD =
    primaryCurrency === 'USD'
      ? totalBalance
      : totalBalance / defaultExchangeRate;

  // Рассчитываем дебиторку и кредиторку из запланированных транзакций
  // Дебиторка = запланированные доходы (is_scheduled=true, type='income')
  // Кредиторка = запланированные расходы (is_scheduled=true, type='expense')
  // Логика конвертации:
  // - converted_amount - сумма в валюте счета (primary_currency)
  // - amount - сумма в валюте транзакции (если exchange_rate !== 1, то валюта транзакции != валюте счета)
  const { receivables, payables } = scheduledTransactions.reduce(
    (acc, transaction) => {
      // Получаем валюту счета транзакции
      const accountCurrency = transaction.accounts?.currency || primaryCurrency;

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
  // Группируем транзакции по проектам
  const projectIncomeMap = new Map<string, number>();
  
  // Считаем доходы по каждому проекту в валюте проекта
  projectTransactions.forEach((transaction) => {
    // Нормализуем связанные данные (Supabase может возвращать их как массив или объект)
    const project = Array.isArray(transaction.projects) 
      ? transaction.projects[0] 
      : transaction.projects;
    
    const account = Array.isArray(transaction.accounts)
      ? transaction.accounts[0]
      : transaction.accounts;
    
    if (!project || !project.budget || !project.currency) {
      return;
    }

    const projectId = project.id;
    if (!projectIncomeMap.has(projectId)) {
      projectIncomeMap.set(projectId, 0);
    }

    // Получаем валюту счета транзакции
    const accountCurrency = account?.currency || 'RUB';
    
    // Определяем валюту транзакции
    const isTransactionInDifferentCurrency =
      transaction.exchange_rate !== 1 && transaction.exchange_rate !== null;
    
    const transactionCurrency = isTransactionInDifferentCurrency
      ? accountCurrency === 'RUB' ? 'USD' : 'RUB'
      : accountCurrency;

    // Получаем курс проекта (используем курс проекта, если указан, иначе курс по умолчанию)
    const projectExchangeRate = project.exchange_rate || defaultExchangeRate;

    // Конвертируем сумму дохода в валюту проекта
    let amountInProjectCurrency: number;

    if (project.currency === transactionCurrency) {
      // Валюта проекта совпадает с валютой транзакции
      amountInProjectCurrency = transaction.amount;
    } else {
      // Валюта проекта отличается от валюты транзакции
      if (transactionCurrency === 'USD' && project.currency === 'RUB') {
        // Конвертируем USD -> RUB: умножаем на курс
        amountInProjectCurrency = transaction.amount * projectExchangeRate;
      } else if (transactionCurrency === 'RUB' && project.currency === 'USD') {
        // Конвертируем RUB -> USD: делим на курс
        amountInProjectCurrency = transaction.amount / projectExchangeRate;
      } else {
        amountInProjectCurrency = transaction.amount;
      }
    }

    projectIncomeMap.set(projectId, projectIncomeMap.get(projectId)! + amountInProjectCurrency);
  });

  // Считаем разницу между бюджетом и доходами для каждого проекта
  // Используем allProjectsWithBudget, чтобы учесть все проекты с бюджетом, а не только последние 10
  let budgetReceivables = 0;
  allProjectsWithBudget.forEach((project) => {
    const projectIncome = projectIncomeMap.get(project.id) || 0;

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

      budgetReceivables += differenceInPrimaryCurrency;
    }
  });

  // Итоговая дебиторка = запланированные доходы + разница между бюджетом и доходами
  const totalReceivables = receivables + budgetReceivables;

  // Форматирование суммы
  const formatAmount = (amount: number, currency: string) => {
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: currency,
    });
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Форматирование времени
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
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

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {/* Общий баланс - большая карточка (занимает 2 колонки на больших экранах) */}
      <Card className='md:col-span-2'>
        <CardHeader>
          <CardTitle>Общий баланс</CardTitle>
          <CardDescription>
            Сумма всех ваших счетов в{' '}
            {primaryCurrency === 'RUB' ? 'рублях' : 'долларах'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline gap-2'>
            <div className='text-3xl font-bold text-zinc-900 dark:text-zinc-50'>
              {formatAmount(totalBalance, primaryCurrency)}
            </div>
            <div className='text-sm font-normal text-zinc-500 dark:text-zinc-400'>
              ≈ {formatAmount(totalBalanceUSD, 'USD')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Баланс по счетам */}
      <Card className='md:col-span-1'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Счета</CardTitle>
              <CardDescription>Баланс по каждому счету</CardDescription>
            </div>
            <Link href='/accounts'>
              <Button variant='outline' size='sm'>
                Все счета
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className='ml-2'
                />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className='text-center text-muted-foreground py-4'>
              У вас пока нет счетов
            </p>
          ) : (
            <div className='space-y-3'>
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className='block'
                >
                  <div className='flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950'>
                    <div className='flex-1'>
                      <div className='font-medium text-zinc-900 dark:text-zinc-50'>
                        {account.name}
                      </div>
                      <div className='text-sm text-zinc-600 dark:text-zinc-400'>
                        {formatAmount(account.balance, account.currency)}
                      </div>
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={20}
                      className='text-zinc-400'
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Дебиторка и кредиторка */}
      <Card className='md:col-span-1'>
        <CardHeader>
          <CardTitle>Дебиторка и кредиторка</CardTitle>
          <CardDescription>Запланированные операции</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1'>
              Дебиторка
            </p>
            <div className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>
              {formatAmount(totalReceivables, primaryCurrency)}
            </div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
              Запланированные доходы
            </p>
          </div>
          <div className='pt-2 border-t border-zinc-200 dark:border-zinc-800'>
            <p className='text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1'>
              Кредиторка
            </p>
            <div className='text-xl font-bold text-red-600 dark:text-red-400'>
              {formatAmount(payables, primaryCurrency)}
            </div>
            <p className='text-xs text-zinc-500 dark:text-zinc-400 mt-0.5'>
              Запланированные расходы
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Проекты */}
      <Card className='md:col-span-1'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Проекты</CardTitle>
              <CardDescription>
                Активных проектов: {projectsCount}
              </CardDescription>
            </div>
            <Link href='/projects'>
              <Button variant='outline' size='sm'>
                Все
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className='ml-2'
                />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className='text-center text-muted-foreground py-4 text-sm'>
              Нет проектов
            </p>
          ) : (
            <div className='space-y-2'>
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className='block'
                >
                  <div className='flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950'>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-zinc-900 dark:text-zinc-50 truncate'>
                        {project.title}
                      </div>
                      {project.budget !== null && project.currency && (
                        <div className='text-xs text-zinc-600 dark:text-zinc-400 mt-0.5'>
                          {formatAmount(project.budget, project.currency)}
                        </div>
                      )}
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={16}
                      className='text-zinc-400 ml-2 flex-shrink-0'
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Контрагенты */}
      <Card className='md:col-span-1'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Контрагенты</CardTitle>
              <CardDescription>Всего: {counterpartiesCount}</CardDescription>
            </div>
            <Link href='/counterparties'>
              <Button variant='outline' size='sm'>
                Все
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className='ml-2'
                />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {counterparties.length === 0 ? (
            <p className='text-center text-muted-foreground py-4 text-sm'>
              Нет контрагентов
            </p>
          ) : (
            <div className='space-y-2'>
              {counterparties.slice(0, 5).map((counterparty) => (
                <Link
                  key={counterparty.id}
                  href={`/counterparties/${counterparty.id}`}
                  className='block'
                >
                  <div className='flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950'>
                    <div className='flex-1 min-w-0'>
                      <div className='font-medium text-zinc-900 dark:text-zinc-50 truncate'>
                        {counterparty.name}
                      </div>
                      <div className='text-xs text-zinc-600 dark:text-zinc-400 mt-0.5'>
                        {counterparty.type === 'client'
                          ? 'Клиент'
                          : 'Подрядчик'}
                      </div>
                    </div>
                    <HugeiconsIcon
                      icon={ArrowRight01Icon}
                      size={16}
                      className='text-zinc-400 ml-2 flex-shrink-0'
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Последние транзакции - длинная карточка (занимает всю ширину на больших экранах) */}
      <Card className='md:col-span-2 lg:col-span-3'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Последние транзакции</CardTitle>
              <CardDescription>
                Последние {transactions.length} транзакций
              </CardDescription>
            </div>
            <Link href='/transactions'>
              <Button variant='outline' size='sm'>
                Все транзакции
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  className='ml-2'
                />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className='text-center text-muted-foreground py-4'>
              У вас пока нет транзакций
            </p>
          ) : (
            <div className='space-y-2'>
              {transactions.slice(0, 5).map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                const isNegative =
                  transaction.type === 'expense' ||
                  transaction.type === 'withdrawal';
                const isScheduled = transaction.is_scheduled;

                // Нормализуем связанные данные (Supabase может возвращать их как массив или объект)
                const project = Array.isArray(transaction.projects) 
                  ? transaction.projects[0] 
                  : transaction.projects;

                // Определяем, была ли транзакция в валюте, отличной от валюты счета
                const isDifferentCurrency =
                  transaction.exchange_rate !== 1 &&
                  transaction.exchange_rate !== null;

                return (
                  <div
                    key={transaction.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                      isScheduled
                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/10'
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                        getTransactionTypeColor(transaction.type)
                      )}
                    >
                      <Icon className='h-4 w-4' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <div className='font-medium text-zinc-900 dark:text-zinc-50 truncate'>
                          {transaction.description ||
                            transaction.categories?.name ||
                            'Без описания'}
                        </div>
                        {/* Лейбл запланированной транзакции */}
                        {isScheduled && (
                          <span className='inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex-shrink-0'>
                            <HugeiconsIcon icon={Calendar01Icon} size={12} />
                            Запланировано
                          </span>
                        )}
                      </div>
                      <div className='mt-0.5 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap'>
                        {transaction.accounts?.name && (
                          <span className='truncate'>
                            {transaction.accounts.name}
                          </span>
                        )}
                        {project?.title && (
                          <>
                            <span className='text-zinc-400'>•</span>
                            <span className='truncate'>
                              {project.title}
                            </span>
                          </>
                        )}
                        <span className='text-zinc-400'>•</span>
                        <span className='truncate'>
                          {formatDate(transaction.created_at)}
                        </span>
                        {/* Дата запланированной транзакции (только для неподтвержденных) */}
                        {transaction.scheduled_date && isScheduled && (
                          <>
                            <span className='text-zinc-400'>•</span>
                            <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-600 dark:bg-amber-950 dark:text-amber-400'>
                              <HugeiconsIcon icon={Calendar01Icon} size={10} />
                              {new Date(
                                transaction.scheduled_date
                              ).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      <div className='text-right'>
                        {isDifferentCurrency ? (
                          <>
                            <div
                              className={cn(
                                'font-medium text-sm',
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
                            </div>
                            <div className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                              (
                              {formatAmount(
                                Math.abs(transaction.amount),
                                transaction.accounts?.currency === 'RUB'
                                  ? 'USD'
                                  : 'RUB'
                              )}
                              )
                            </div>
                          </>
                        ) : (
                          <div
                            className={cn(
                              'font-medium text-sm',
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
                          </div>
                        )}
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

      {/* Модалка редактирования транзакции */}
      {transactionFormData && editingTransaction && (() => {
        // Нормализуем транзакцию для передачи в TransactionFormDialog
        // (преобразуем массив projects в объект или null, если это массив)
        const normalizedProject = Array.isArray(editingTransaction.projects)
          ? editingTransaction.projects[0] || null
          : editingTransaction.projects;
        
        const normalizedTransaction: TransactionListType = {
          ...editingTransaction,
          transaction_date: editingTransaction.transaction_date ?? null,
          projects: normalizedProject,
        };
        
        return (
          <TransactionFormDialog
            open={!!editingTransaction}
            onOpenChange={(open) => {
              if (!open) {
                setEditingTransaction(null);
                // Обновляем страницу после редактирования транзакции
                router.refresh();
              }
            }}
            transaction={normalizedTransaction}
            formData={transactionFormData}
          />
        );
      })()}
    </div>
  );
}
