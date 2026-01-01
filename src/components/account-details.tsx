'use client';

import { useState } from 'react';
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
import { deleteAccount } from '@/app/accounts/actions';
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
} from '@hugeicons/core-free-icons';

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
  amount: number;
  currency?: string;
  type: 'income' | 'expense' | 'withdrawal';
  description: string | null;
  created_at: string;
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
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className='flex items-center justify-between border-b pb-4 last:border-0 last:pb-0'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`font-medium ${getTransactionTypeColor(
                            transaction.type
                          )}`}
                        >
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        <span className='text-sm text-muted-foreground'>
                          {new Date(transaction.created_at).toLocaleDateString(
                            'ru-RU',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                      {transaction.description && (
                        <p className='mt-1 text-sm text-muted-foreground'>
                          {transaction.description}
                        </p>
                      )}
                    </div>
                    <div className='text-right'>
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
                    </div>
                  </div>
                ))}
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
    </>
  );
}
