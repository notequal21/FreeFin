'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Briefcase } from 'lucide-react';

/**
 * Компонент табов для фильтрации контрагентов
 */
export function CounterpartiesTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Получаем тип контрагента из URL параметра или используем 'all' по умолчанию
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
    // Обновляем URL с параметром типа контрагента
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete('type');
    } else {
      params.set('type', value);
    }
    router.push(`/counterparties${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
      <TabsList className='grid w-full max-w-md grid-cols-3'>
        <TabsTrigger value='all'>Все</TabsTrigger>
        <TabsTrigger value='clients' className='flex items-center gap-2'>
          <Users className='h-4 w-4' />
          Клиенты
        </TabsTrigger>
        <TabsTrigger value='contractors' className='flex items-center gap-2'>
          <Briefcase className='h-4 w-4' />
          Подрядчики
        </TabsTrigger>
      </TabsList>

      {/* Контент для всех контрагентов */}
      <TabsContent value='all' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться все контрагенты
          </p>
        </div>
      </TabsContent>

      {/* Контент для клиентов */}
      <TabsContent value='clients' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться клиенты
          </p>
        </div>
      </TabsContent>

      {/* Контент для подрядчиков */}
      <TabsContent value='contractors' className='mt-6'>
        <div className='rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'>
          <p className='text-zinc-600 dark:text-zinc-400'>
            Здесь будут отображаться подрядчики
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

