'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';
import { TransactionsList, Transaction } from '@/components/transactions-list';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';

interface TransactionsTabsProps {
  transactions: Transaction[];
  formData?: {
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
  };
}

/**
 * Компонент табов для фильтрации транзакций
 */
export function TransactionsTabs({
  transactions,
  formData,
}: TransactionsTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<
    'income' | 'expense' | 'withdrawal' | undefined
  >();

  // Получаем тип транзакции из URL параметра или используем 'all' по умолчанию
  const [activeTab, setActiveTab] = useState(searchParams.get('type') || 'all');

  // Синхронизируем состояние с URL при изменении параметров
  useEffect(() => {
    const type = searchParams.get('type') || 'all';
    setActiveTab(type);

    // Проверяем, нужно ли открыть модалку
    const shouldOpenDialog = searchParams.get('openDialog') === 'true';
    if (shouldOpenDialog) {
      setIsCreateDialogOpen(true);
      // Убираем параметр из URL после открытия модалки
      const params = new URLSearchParams(searchParams.toString());
      params.delete('openDialog');
      const newUrl = `/transactions${
        params.toString() ? `?${params.toString()}` : ''
      }`;
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  // Обработчик изменения таба
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Обновляем URL с параметром типа транзакции
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    router.push(
      `/transactions${params.toString() ? `?${params.toString()}` : ''}`
    );
  };

  // Обработчик открытия модалки с предустановленным типом
  const handleOpenDialog = (type?: 'income' | 'expense' | 'withdrawal') => {
    setDefaultType(type);
    setIsCreateDialogOpen(true);
  };

  // Фильтрация транзакций по типу
  const getFilteredTransactions = (type?: string): Transaction[] => {
    if (!type || type === 'all') {
      return transactions;
    }
    // Преобразуем 'transfer' в 'withdrawal' для фильтрации
    const dbType = type === 'transfer' ? 'withdrawal' : type;
    return transactions.filter((t) => t.type === dbType);
  };

  return (
    <>
      <div className='mb-4 flex items-center justify-between'>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='w-full'
        >
          <div className='flex items-center justify-between mb-4'>
            <TabsList className='grid grid-cols-4'>
              <TabsTrigger value='all'>Все</TabsTrigger>
              <TabsTrigger value='income' className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4' />
                Доходы
              </TabsTrigger>
              <TabsTrigger value='expense' className='flex items-center gap-2'>
                <TrendingDown className='h-4 w-4' />
                Расходы
              </TabsTrigger>
              <TabsTrigger value='transfer' className='flex items-center gap-2'>
                <ArrowLeftRight className='h-4 w-4' />
                Переводы
              </TabsTrigger>
            </TabsList>
            <div className='flex gap-2'>
              <Button onClick={() => handleOpenDialog()}>
                Добавить транзакцию
              </Button>
              {/* <Button variant="outline" onClick={() => handleOpenDialog('income')}>
                Доход
              </Button>
              <Button variant="outline" onClick={() => handleOpenDialog('expense')}>
                Расход
              </Button>
              <Button variant="outline" onClick={() => handleOpenDialog('withdrawal')}>
                Перевод
              </Button> */}
            </div>
          </div>

          {/* Контент для всех транзакций */}
          <TabsContent value='all' className='mt-6'>
            <TransactionsList
              transactions={getFilteredTransactions('all')}
              formData={formData}
            />
          </TabsContent>

          {/* Контент для доходов */}
          <TabsContent value='income' className='mt-6'>
            <TransactionsList
              transactions={getFilteredTransactions('income')}
              formData={formData}
            />
          </TabsContent>

          {/* Контент для расходов */}
          <TabsContent value='expense' className='mt-6'>
            <TransactionsList
              transactions={getFilteredTransactions('expense')}
              formData={formData}
            />
          </TabsContent>

          {/* Контент для переводов */}
          <TabsContent value='transfer' className='mt-6'>
            <TransactionsList
              transactions={getFilteredTransactions('transfer')}
              formData={formData}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Модалка создания транзакции */}
      <TransactionFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setDefaultType(undefined);
          }
        }}
        defaultType={defaultType}
        formData={formData}
      />
    </>
  );
}
