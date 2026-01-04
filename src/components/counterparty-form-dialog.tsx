'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createCounterparty,
  updateCounterparty,
} from '@/app/counterparties/actions';
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

// Схема валидации для формы контрагента
const counterpartySchema = z.object({
  name: z.string().min(1, 'Название контрагента обязательно'),
  type: z.enum(['client', 'contractor'], {
    message: 'Тип должен быть client или contractor',
  }),
});

type CounterpartyFormData = z.infer<typeof counterpartySchema>;

interface CounterpartyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty?: {
    id: string;
    name: string;
    type: 'client' | 'contractor';
  } | null;
}

/**
 * Модалка для создания или редактирования контрагента
 */
export function CounterpartyFormDialog({
  open,
  onOpenChange,
  counterparty,
}: CounterpartyFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false); // Состояние загрузки для создания/обновления контрагента

  const form = useForm<CounterpartyFormData>({
    resolver: zodResolver(counterpartySchema),
    defaultValues: {
      name: '',
      type: 'client',
    },
  });

  // Обновляем форму при изменении counterparty
  useEffect(() => {
    if (counterparty) {
      form.reset({
        name: counterparty.name,
        type: counterparty.type,
      });
    } else {
      form.reset({
        name: '',
        type: 'client',
      });
    }

    // Сбрасываем состояние загрузки при закрытии диалога
    if (!open) {
      setIsSubmitting(false);
    }
  }, [counterparty, form, open]);

  const onSubmit = async (data: CounterpartyFormData) => {
    // Предотвращаем повторную отправку формы
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('type', data.type);

      if (counterparty) {
        // Редактирование существующего контрагента
        formData.append('id', counterparty.id);
        const result = await updateCounterparty(formData);

        if (result.error) {
          toast.error('Ошибка', {
            description: result.error,
          });
        } else {
          toast.success('Контрагент обновлен');
          onOpenChange(false);
          form.reset();
        }
      } else {
        // Создание нового контрагента
        const result = await createCounterparty(formData);

        if (result.error) {
          toast.error('Ошибка', {
            description: result.error,
          });
        } else {
          toast.success('Контрагент создан');
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
            {counterparty ? 'Редактировать контрагента' : 'Создать контрагента'}
          </DialogTitle>
          <DialogDescription>
            {counterparty
              ? 'Измените данные контрагента'
              : 'Заполните форму для создания нового контрагента'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название контрагента</FormLabel>
                  <FormControl>
                    <Input placeholder='Например: ООО Компания' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип контрагента</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Выберите тип' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='client'>Клиент</SelectItem>
                      <SelectItem value='contractor'>Подрядчик</SelectItem>
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
                  ? counterparty
                    ? 'Сохранение...'
                    : 'Создание...'
                  : counterparty
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
