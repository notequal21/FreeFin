'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  exchange_rate: number;
  converted_amount: number;
  type: 'income' | 'expense' | 'withdrawal';
  description: string | null;
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

interface DashboardProps {
  accounts: Account[];
  projects: Project[];
  projectsCount: number;
  counterparties: Counterparty[];
  counterpartiesCount: number;
  transactions: Transaction[];
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
  primaryCurrency,
  defaultExchangeRate,
}: DashboardProps) {
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
  const totalBalanceUSD = primaryCurrency === 'USD'
    ? totalBalance
    : totalBalance / defaultExchangeRate;

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Общий баланс - большая карточка (занимает 2 колонки на больших экранах) */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Общий баланс</CardTitle>
          <CardDescription>
            Сумма всех ваших счетов в {primaryCurrency === 'RUB' ? 'рублях' : 'долларах'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatAmount(totalBalance, primaryCurrency)}
            </div>
            <div className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
              ≈ {formatAmount(totalBalanceUSD, 'USD')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Баланс по счетам */}
      <Card className="md:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Счета</CardTitle>
              <CardDescription>
                Баланс по каждому счету
              </CardDescription>
            </div>
            <Link href="/accounts">
              <Button variant="outline" size="sm">
                Все счета
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              У вас пока нет счетов
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950">
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {account.name}
                      </div>
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatAmount(account.balance, account.currency)}
                      </div>
                    </div>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={20} className="text-zinc-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Проекты */}
      <Card className="md:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Проекты</CardTitle>
              <CardDescription>
                Всего: {projectsCount}
              </CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm">
                Все
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Нет проектов
            </p>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                        {project.title}
                      </div>
                      {project.budget !== null && project.currency && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {formatAmount(project.budget, project.currency)}
                        </div>
                      )}
                    </div>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-zinc-400 ml-2 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Контрагенты */}
      <Card className="md:col-span-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Контрагенты</CardTitle>
              <CardDescription>
                Всего: {counterpartiesCount}
              </CardDescription>
            </div>
            <Link href="/counterparties">
              <Button variant="outline" size="sm">
                Все
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {counterparties.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Нет контрагентов
            </p>
          ) : (
            <div className="space-y-2">
              {counterparties.slice(0, 5).map((counterparty) => (
                <Link
                  key={counterparty.id}
                  href={`/counterparties/${counterparty.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-950">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                        {counterparty.name}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {counterparty.type === 'client' ? 'Клиент' : 'Подрядчик'}
                      </div>
                    </div>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-zinc-400 ml-2 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Последние транзакции - длинная карточка (занимает всю ширину на больших экранах) */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Последние транзакции</CardTitle>
              <CardDescription>
                Последние {transactions.length} транзакций
              </CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                Все транзакции
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              У вас пока нет транзакций
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                const isNegative =
                  transaction.type === 'expense' ||
                  transaction.type === 'withdrawal';

                // Определяем, была ли транзакция в валюте, отличной от валюты счета
                const isDifferentCurrency =
                  transaction.exchange_rate !== 1 &&
                  transaction.exchange_rate !== null;

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0',
                        getTransactionTypeColor(transaction.type)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                        {transaction.description ||
                          transaction.categories?.name ||
                          'Без описания'}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {transaction.accounts?.name && (
                          <span className="truncate">{transaction.accounts.name}</span>
                        )}
                        {transaction.projects?.title && (
                          <>
                            <span className="text-zinc-400">•</span>
                            <span className="truncate">{transaction.projects.title}</span>
                          </>
                        )}
                        <span className="text-zinc-400">•</span>
                        <span className="truncate">
                          {formatDate(transaction.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
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
                          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

