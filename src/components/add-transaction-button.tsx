'use client';

import { Button } from '@/components/ui/button';
import { useTransactionDialog } from '@/contexts/transaction-dialog-context';

/**
 * Клиентский компонент кнопки "Добавить транзакцию" для хедера
 * Открывает глобальную модалку создания транзакции из любого места приложения
 */
export function AddTransactionButton() {
  const { openDialog } = useTransactionDialog();

  const handleClick = () => {
    // Открываем модалку без редиректа
    openDialog();
  };

  return (
    <Button
      onClick={handleClick}
      variant='default'
      size='sm'
      className='bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
    >
      Добавить транзакцию
    </Button>
  );
}
