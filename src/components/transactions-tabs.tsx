'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react';

/**
 * Компонент табов для фильтрации транзакций
 */
export function TransactionsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Получаем тип транзакции из URL параметра или используем 'all' по умолчанию
  const [activeTab, setActiveTab] = useState(
    searchParams.get('type') || 'all'
  );

  // Синхронизируем состояние с URL при изменении параметров
  useEffect(() => {
    const type = searchParams.get('type') || 'all';
    setActiveTab(type);
  }, [searchParams]);

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
    router.push(`/transactions${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
      <TabsList className='grid w-full max-w-md grid-cols-4'>
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

      {/* Контент для всех транзакций */}
      <TabsContent value='all' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться все транзакции
          </p>
        </div>
      </TabsContent>

      {/* Контент для доходов */}
      <TabsContent value='income' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться только доходы
          </p>
        </div>
      </TabsContent>

      {/* Контент для расходов */}
      <TabsContent value='expense' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться только расходы
          </p>
        </div>
      </TabsContent>

      {/* Контент для переводов */}
      <TabsContent value='transfer' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться только переводы
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

