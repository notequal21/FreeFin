'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/app/transactions/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Transaction } from './transactions-list';
import { X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ru as ruDayPicker } from 'react-day-picker/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tag01Icon } from '@hugeicons/core-free-icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Схема валидации для формы транзакции
const transactionSchema = z.object({
  account_id: z.string().uuid('Некорректный ID счета'),
  category_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
  amount: z
    .number('Сумма должна быть числом')
    .positive('Сумма должна быть положительной'),
  transaction_currency: z.enum(['USD', 'RUB']).optional(),
  exchange_rate: z.number().positive('Курс обмена должен быть положительным'),
  type: z.enum(['income', 'expense', 'withdrawal']),
  tags: z.array(z.string()),
  description: z.string().nullable().optional(),
  is_scheduled: z.boolean(),
  scheduled_date: z.date().nullable().optional(),
  transaction_date: z.date().nullable().optional(), // Дата транзакции (по умолчанию текущая дата)
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  defaultType?: 'income' | 'expense' | 'withdrawal';
  defaultAccountId?: string | null;
  defaultProjectId?: string | null;
  defaultCounterpartyId?: string | null;
  formData?: {
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
    defaultExchangeRate?: number;
    primaryCurrency?: string;
  };
}

/**
 * Модалка для создания или редактирования транзакции
 */
export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultType,
  defaultAccountId,
  defaultProjectId,
  defaultCounterpartyId,
  formData,
}: TransactionFormDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      account_id: '',
      category_id: null,
      project_id: null,
      counterparty_id: null,
      amount: 0, // Начальное значение, будет перезаписано при вводе
      transaction_currency: undefined,
      exchange_rate: 1,
      type: defaultType || 'income',
      tags: [],
      description: null,
      is_scheduled: false,
      scheduled_date: null,
      transaction_date: new Date(), // По умолчанию текущая дата
    },
  });

  // Получаем валюту выбранного счета
  const selectedAccount = formData?.accounts.find(
    (acc) => acc.id === form.watch('account_id')
  );
  const accountCurrency = selectedAccount?.currency || 'RUB';
  const transactionCurrency =
    form.watch('transaction_currency') || accountCurrency;

  // Показываем курс обмена только если валюта транзакции отличается от валюты счета
  const showExchangeRate = transactionCurrency !== accountCurrency;

  // Автоматически заполняем курс по умолчанию при изменении валюты транзакции
  useEffect(() => {
    // Пропускаем, если это редактирование существующей транзакции
    if (transaction) {
      return;
    }

    // Если валюта транзакции отличается от валюты счета
    if (showExchangeRate && formData?.defaultExchangeRate) {
      const currentExchangeRate = form.watch('exchange_rate');
      // Заполняем курс по умолчанию, если:
      // 1. Курс равен 1 (начальное значение) - значит пользователь еще не вводил курс
      // 2. Или валюта транзакции только что изменилась (т.е. пользователь выбрал другую валюту)
      if (currentExchangeRate === 1) {
        form.setValue('exchange_rate', formData.defaultExchangeRate);
      }
    } else if (!showExchangeRate) {
      // Если валюта транзакции совпадает с валютой счета, сбрасываем курс на 1
      form.setValue('exchange_rate', 1);
    }
  }, [
    transactionCurrency,
    accountCurrency,
    showExchangeRate,
    formData?.defaultExchangeRate,
    form,
    transaction,
  ]);

  // Обновляем форму при изменении transaction или defaultType
  useEffect(() => {
    if (transaction) {
      const account = formData?.accounts.find(
        (acc) => acc.id === transaction.account_id
      );
      form.reset({
        account_id: transaction.account_id,
        category_id: transaction.category_id || null,
        project_id: transaction.project_id || null,
        counterparty_id: transaction.counterparty_id || null,
        amount: transaction.amount,
        transaction_currency: account?.currency as 'USD' | 'RUB' | undefined,
        exchange_rate: transaction.exchange_rate || 1,
        type: transaction.type,
        tags: transaction.tags || [],
        description: transaction.description || null,
        is_scheduled: transaction.is_scheduled || false,
        scheduled_date: transaction.scheduled_date
          ? new Date(transaction.scheduled_date)
          : null,
        transaction_date: transaction.transaction_date
          ? new Date(transaction.transaction_date)
          : new Date(),
      });
      setTagInput('');
    } else if (open) {
      // Обновляем форму только при открытии модалки, если нет транзакции
      form.reset({
        account_id: defaultAccountId || '',
        category_id: null,
        project_id: defaultProjectId || null,
        counterparty_id: defaultCounterpartyId || null,
        amount: 0, // Начальное значение, будет перезаписано при вводе
        transaction_currency: undefined,
        exchange_rate: 1,
        type: defaultType || 'income',
        tags: [],
        description: null,
        is_scheduled: false,
        scheduled_date: null,
        transaction_date: new Date(), // По умолчанию текущая дата
      });
      setTagInput('');
    }
  }, [
    transaction,
    defaultType,
    defaultAccountId,
    defaultProjectId,
    defaultCounterpartyId,
    open,
    form,
    formData,
  ]);

  // Получаем категории для текущего типа транзакции
  const availableCategories =
    formData?.categories.filter(
      (cat) =>
        cat.type === form.watch('type') || form.watch('type') === 'withdrawal'
    ) || [];

  const onSubmit = async (data: TransactionFormData) => {
    const formDataObj = new FormData();
    formDataObj.append('account_id', data.account_id);
    if (data.category_id) {
      formDataObj.append('category_id', data.category_id);
    }
    if (data.project_id) {
      formDataObj.append('project_id', data.project_id);
    }
    if (data.counterparty_id) {
      formDataObj.append('counterparty_id', data.counterparty_id);
    }
    formDataObj.append('amount', data.amount.toString());
    // Используем курс обмена только если валюта транзакции отличается от валюты счета
    const finalExchangeRate = showExchangeRate ? data.exchange_rate : 1;
    formDataObj.append('exchange_rate', finalExchangeRate.toString());
    formDataObj.append('type', data.type);
    formDataObj.append('tags', JSON.stringify(data.tags || []));
    if (data.description) {
      formDataObj.append('description', data.description);
    }
    formDataObj.append('is_scheduled', data.is_scheduled ? 'true' : 'false');
    if (data.is_scheduled && data.scheduled_date) {
      // Форматируем дату в формат YYYY-MM-DD для отправки на сервер
      const dateStr = format(data.scheduled_date, 'yyyy-MM-dd');
      formDataObj.append('scheduled_date', dateStr);
    }
    if (data.transaction_date) {
      // Форматируем дату транзакции в формат YYYY-MM-DD для отправки на сервер
      const dateStr = format(data.transaction_date, 'yyyy-MM-dd');
      formDataObj.append('transaction_date', dateStr);
    }

    if (transaction) {
      // Редактирование существующей транзакции
      formDataObj.append('id', transaction.id);
      const result = await updateTransaction(formDataObj);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Транзакция обновлена');
        onOpenChange(false);
        form.reset();
        setTagInput('');
      }
    } else {
      // Создание новой транзакции
      const result = await createTransaction(formDataObj);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Транзакция создана');
        onOpenChange(false);
        form.reset();
        setTagInput('');
      }
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    const result = await deleteTransaction(transaction.id);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsDeleting(false);
    } else {
      toast.success('Транзакция удалена');
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      form.reset();
      setTagInput('');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {transaction ? 'Редактировать транзакцию' : 'Создать транзакцию'}
            </DialogTitle>
            <DialogDescription>
              {transaction
                ? 'Измените данные транзакции'
                : 'Заполните форму для создания новой транзакции'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                // Обработка ошибок валидации на клиенте
                const firstErrorKey = Object.keys(errors)[0];
                if (firstErrorKey) {
                  const error = errors[firstErrorKey as keyof typeof errors];
                  const errorMessage =
                    error?.message ||
                    'Пожалуйста, заполните все обязательные поля';
                  toast.error('Ошибка валидации', {
                    description: errorMessage,
                  });
                }
              })}
              className='space-y-4'
            >
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип транзакции</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) => {
                          if (!defaultType || transaction) {
                            field.onChange(value);
                          }
                        }}
                        className='w-full'
                      >
                        <TabsList className='grid w-full grid-cols-3'>
                          <TabsTrigger
                            value='income'
                            disabled={
                              !!defaultType &&
                              !transaction &&
                              defaultType !== 'income'
                            }
                          >
                            Доход
                          </TabsTrigger>
                          <TabsTrigger
                            value='expense'
                            disabled={
                              !!defaultType &&
                              !transaction &&
                              defaultType !== 'expense'
                            }
                          >
                            Расход
                          </TabsTrigger>
                          <TabsTrigger
                            value='withdrawal'
                            disabled={
                              !!defaultType &&
                              !transaction &&
                              defaultType !== 'withdrawal'
                            }
                          >
                            Перевод
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='account_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Счет</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Выберите счет' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {formData?.accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} ({account.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('type') !== 'withdrawal' && (
                <FormField
                  control={form.control}
                  name='category_id'
                  render={({ field }) => (
                    <FormItem>
                      <div className='flex items-center justify-between'>
                        <FormLabel>Категория</FormLabel>
                        <Link href='/settings/categories'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-8 text-xs'
                          >
                            <HugeiconsIcon
                              icon={Tag01Icon}
                              size={16}
                              className='mr-1'
                            />
                            Управление
                          </Button>
                        </Link>
                      </div>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? null : value)
                        }
                        value={field.value || '__none__'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Выберите категорию (необязательно)' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='__none__'>Не выбрано</SelectItem>
                          {availableCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name='project_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Выберите проект (необязательно)' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='__none__'>Не выбрано</SelectItem>
                        {formData?.projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='counterparty_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Контрагент</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? null : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Выберите контрагента (необязательно)' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='__none__'>Не выбрано</SelectItem>
                        {formData?.counterparties.map((counterparty) => (
                          <SelectItem
                            key={counterparty.id}
                            value={counterparty.id}
                          >
                            {counterparty.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Сумма</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0'
                        {...field}
                        value={field.value === 0 ? '' : field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Преобразуем строку в число
                          if (
                            value === '' ||
                            value === null ||
                            value === undefined
                          ) {
                            // Если значение пустое, устанавливаем 0 (валидация сработает при отправке)
                            field.onChange(0);
                          } else {
                            const numValue = Number(value);
                            // Проверяем, что значение является валидным числом
                            if (!isNaN(numValue) && isFinite(numValue)) {
                              field.onChange(numValue);
                            } else {
                              // Если значение не является числом, устанавливаем 0
                              field.onChange(0);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='transaction_currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта транзакции</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Автоматически заполняем курс по умолчанию при изменении валюты транзакции
                        if (
                          value !== accountCurrency &&
                          formData?.defaultExchangeRate &&
                          !transaction
                        ) {
                          form.setValue(
                            'exchange_rate',
                            formData.defaultExchangeRate
                          );
                        } else if (value === accountCurrency) {
                          form.setValue('exchange_rate', 1);
                        }
                      }}
                      value={field.value || accountCurrency}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Выберите валюту' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='RUB'>RUB</SelectItem>
                        <SelectItem value='USD'>USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showExchangeRate && (
                <FormField
                  control={form.control}
                  name='exchange_rate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Курс обмена ({accountCurrency} → {transactionCurrency})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.0001'
                          placeholder='1'
                          {...field}
                          value={field.value === 1 ? '' : field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Преобразуем строку в число
                            if (
                              value === '' ||
                              value === null ||
                              value === undefined
                            ) {
                              // Если значение пустое, устанавливаем 1 (значение по умолчанию)
                              field.onChange(1);
                            } else {
                              const numValue = Number(value);
                              // Проверяем, что значение является валидным числом
                              if (!isNaN(numValue) && isFinite(numValue)) {
                                field.onChange(numValue);
                              } else {
                                // Если значение не является числом, устанавливаем 1
                                field.onChange(1);
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Комментарий к транзакции (необязательно)'
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='transaction_date'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Дата транзакции</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ru })
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          locale={ruDayPicker}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='tags'
                render={({ field }) => {
                  const addTag = () => {
                    const trimmedTag = tagInput.trim();
                    if (trimmedTag && !field.value?.includes(trimmedTag)) {
                      field.onChange([...(field.value || []), trimmedTag]);
                      setTagInput('');
                    }
                  };

                  const removeTag = (tagToRemove: string) => {
                    field.onChange(
                      field.value?.filter((tag) => tag !== tagToRemove) || []
                    );
                  };

                  const handleKeyDown = (
                    e: React.KeyboardEvent<HTMLInputElement>
                  ) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  };

                  return (
                    <FormItem>
                      <FormLabel>Теги</FormLabel>
                      <FormControl>
                        <div className='space-y-2'>
                          {/* Список выбранных тегов */}
                          {field.value && field.value.length > 0 && (
                            <div className='flex flex-wrap gap-2'>
                              {field.value.map((tag, index) => (
                                <span
                                  key={index}
                                  className='inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                >
                                  {tag}
                                  <button
                                    type='button'
                                    onClick={() => removeTag(tag)}
                                    className='ml-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                  >
                                    <X className='h-3 w-3' />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Input для добавления нового тега */}
                          <div className='flex gap-2'>
                            <Input
                              placeholder='Введите тег и нажмите Enter (необязательно)'
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                            />
                            <Button
                              type='button'
                              variant='outline'
                              onClick={addTag}
                              disabled={!tagInput.trim()}
                            >
                              Добавить
                            </Button>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Поля для запланированной транзакции */}
              <FormField
                control={form.control}
                name='is_scheduled'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-start space-x-3 rounded-md border p-4'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className='mt-0.5'
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none flex-1'>
                        <FormLabel
                          className='cursor-pointer font-normal'
                          onClick={() => field.onChange(!field.value)}
                        >
                          Запланированная транзакция
                        </FormLabel>
                        <p className='text-sm text-muted-foreground'>
                          Отметьте, если это запланированная транзакция,
                          требующая ручного подтверждения
                        </p>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {/* Датапикер для даты платежа (показывается только если чекбокс активен) */}
              {form.watch('is_scheduled') && (
                <FormField
                  control={form.control}
                  name='scheduled_date'
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>Дата платежа</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ru })
                              ) : (
                                <span>Выберите дату</span>
                              )}
                              <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0' align='start'>
                          <Calendar
                            mode='single'
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            locale={ruDayPicker}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                {transaction && (
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    Удалить
                  </Button>
                )}
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button type='submit'>
                  {transaction ? 'Сохранить' : 'Создать'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить транзакцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Транзакция будет удалена
              безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-red-600 hover:bg-red-700'
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
