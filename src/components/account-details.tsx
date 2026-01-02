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
import { AccountFormDialog } from '@/components/account-form-dialog';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { deleteAccount } from '@/app/accounts/actions';
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
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: 'USD' | 'RUB';
  created_at: string;
}

interface Transaction {
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

interface AccountDetailsProps {
  account: Account;
  transactions: Transaction[];
}

/**
 * Компонент детального просмотра счета
 */
export function AccountDetails({ account, transactions }: AccountDetailsProps) {
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

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAccount(account.id);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsDeleting(false);
    } else {
      toast.success('Счет удален');
      router.push('/accounts');
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

  return (
    <>
      <div className='container mx-auto p-6'>
        {/* Кнопка назад */}
        <div className='mb-4'>
          <Button
            variant='ghost'
            onClick={() => router.push('/accounts')}
            className='mb-4'
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className='mr-2' />
            Назад к счетам
          </Button>
        </div>

        {/* Заголовок и действия */}
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {account.name}
            </h1>
            <p className='mt-1 text-lg text-muted-foreground'>
              {formatAmount(account.balance, account.currency)}
            </p>
          </div>
          <div className='flex gap-2'>
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
          <Link href={`/transactions/income?account_id=${account.id}`}>
            <Button>Добавить доход</Button>
          </Link>
          <Link href={`/transactions/expense?account_id=${account.id}`}>
            <Button variant='outline'>Добавить расход</Button>
          </Link>
          <Link href={`/transactions/transfer?account_id=${account.id}`}>
            <Button variant='outline'>Создать перевод</Button>
          </Link>
        </div>

        {/* Список транзакций */}
        <Card>
          <CardHeader>
            <CardTitle>Транзакции</CardTitle>
            <CardDescription>
              Все транзакции, связанные с этим счетом
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
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {/* Дата запланированной транзакции */}
                          {transaction.scheduled_date && (
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
                          {transaction.categories && (
                            <span>
                              Категория: {transaction.categories.name}
                            </span>
                          )}
                          {transaction.projects && (
                            <span>Проект: {transaction.projects.title}</span>
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
                          {/* Определяем, была ли транзакция в валюте, отличной от валюты счета */}
                          {transaction.exchange_rate !== 1 &&
                          transaction.exchange_rate !== null ? (
                            // Транзакция в другой валюте: показываем converted_amount как основную сумму
                            <div className='flex flex-col items-end'>
                              <p
                                className={`font-semibold ${getTransactionTypeColor(
                                  transaction.type
                                )}`}
                              >
                                {transaction.type === 'expense' ? '-' : '+'}
                                {formatAmount(
                                  Math.abs(transaction.converted_amount || 0),
                                  account.currency
                                )}
                              </p>
                              <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                                {/* Определяем исходную валюту транзакции */}(
                                {formatAmount(
                                  Math.abs(transaction.amount),
                                  account.currency === 'RUB' ? 'USD' : 'RUB'
                                )}
                                )
                              </p>
                            </div>
                          ) : (
                            // Транзакция в валюте счета: показываем amount как обычно
                            <p
                              className={`font-semibold ${getTransactionTypeColor(
                                transaction.type
                              )}`}
                            >
                              {transaction.type === 'expense' ? '-' : '+'}
                              {formatAmount(
                                Math.abs(transaction.amount),
                                account.currency
                              )}
                            </p>
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
      </div>

      {/* Модалка редактирования */}
      <AccountFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        account={account}
      />

      {/* Модалка подтверждения удаления */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить счет?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить счет &quot;{account.name}&quot;?
              Это действие нельзя отменить. Все связанные транзакции также будут
              удалены.
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
