'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createAccount, updateAccount } from '@/app/accounts/actions';
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
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

// Схема валидации для формы счета
// ВАЖНО: balance используется только при создании счета (начальный баланс)
// При редактировании баланс вычисляется автоматически триггером и не должен изменяться вручную
const accountSchema = z.object({
  name: z.string().min(1, 'Название счета обязательно'),
  balance: z.number().default(0).optional(),
  currency: z.enum(['USD', 'RUB'], {
    message: 'Валюта должна быть USD или RUB',
  }),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: {
    id: string;
    name: string;
    balance: number;
    currency: 'USD' | 'RUB';
  } | null;
}

/**
 * Модалка для создания или редактирования счета
 */
export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: AccountFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false); // Состояние загрузки для создания/обновления счета

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      balance: 0,
      currency: 'RUB',
    },
  });

  // Обновляем форму при изменении account
  useEffect(() => {
    if (account) {
      // При редактировании не показываем баланс - он вычисляется автоматически триггером
      form.reset({
        name: account.name,
        currency: account.currency,
      });
    } else {
      // При создании показываем поле для начального баланса
      form.reset({
        name: '',
        balance: 0,
        currency: 'RUB',
      });
    }

    // Сбрасываем состояние загрузки при закрытии диалога
    if (!open) {
      setIsSubmitting(false);
    }
  }, [account, form, open]);

  const onSubmit = async (data: AccountFormData) => {
    // Предотвращаем повторную отправку формы
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('currency', data.currency);

      if (account) {
        // Редактирование существующего счета
        // ВАЖНО: balance не передается - он вычисляется автоматически триггером
        formData.append('id', account.id);
        const result = await updateAccount(formData);

        if (result.error) {
          toast.error('Ошибка', {
            description: result.error,
          });
        } else {
          toast.success('Счет обновлен');
          onOpenChange(false);
          form.reset();
        }
      } else {
        // Создание нового счета
        // При создании передаем начальный баланс
        const balance = data.balance ?? 0;
        formData.append('balance', balance.toString());
        const result = await createAccount(formData);

        if (result.error) {
          toast.error('Ошибка', {
            description: result.error,
          });
        } else {
          toast.success('Счет создан');
          onOpenChange(false);
          form.reset();
        }
      }
    } finally {
      // Всегда сбрасываем состояние загрузки после завершения операции
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? 'Редактировать счет' : 'Создать счет'}
          </DialogTitle>
          <DialogDescription>
            {account
              ? 'Измените данные счета'
              : 'Заполните форму для создания нового счета'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название счета</FormLabel>
                  <FormControl>
                    <Input placeholder='Например: Тинькофф' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Поле баланса показывается только при создании счета */}
            {/* При редактировании баланс вычисляется автоматически триггером */}
            {!account && (
              <FormField
                control={form.control}
                name='balance'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Начальный баланс</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0'
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === '' ? undefined : parseFloat(value) || 0
                          );
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
              name='currency'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Валюта</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
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

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting} // Отключаем кнопку отмены во время загрузки
              >
                Отмена
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting
                  ? account
                    ? 'Сохранение...'
                    : 'Создание...'
                  : account
                  ? 'Сохранить'
                  : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
