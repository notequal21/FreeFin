'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createProject, updateProject, getCounterparties } from '@/app/projects/actions';
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

// Схема валидации для формы проекта
const projectSchema = z.object({
  title: z.string().min(1, 'Название проекта обязательно'),
  budget: z.union([
    z.coerce.number().positive(),
    z.null(),
    z.literal(''),
  ]).transform((val) => {
    if (val === '' || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }).nullable(),
  currency: z.enum(['USD', 'RUB']).nullable(),
  exchange_rate: z.union([
    z.coerce.number().positive('Курс должен быть положительным'),
    z.null(),
    z.literal(''),
  ]).transform((val) => {
    if (val === '' || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  }).nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
}).refine((data) => {
  const hasBudget = data.budget !== null && data.budget !== undefined && data.budget !== '';
  const hasCurrency = data.currency !== null && data.currency !== undefined;
  
  // Если бюджет указан, валюта должна быть указана
  if (hasBudget && !hasCurrency) {
    return false;
  }
  // Если валюта указана, бюджет должен быть указан
  if (hasCurrency && !hasBudget) {
    return false;
  }
  return true;
}, {
  message: 'Если указан бюджет, должна быть указана валюта, и наоборот',
  path: ['currency'],
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface Counterparty {
  id: string;
  name: string;
  type: 'client' | 'contractor' | null;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: {
    id: string;
    title: string;
    budget: number | null;
    currency: 'USD' | 'RUB' | null;
    exchange_rate: number | null;
    counterparty_id: string | null;
  } | null;
}

/**
 * Модалка для создания или редактирования проекта
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: ProjectFormDialogProps) {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: '',
      budget: null,
      currency: null,
      exchange_rate: null,
      counterparty_id: null,
    },
  });

  // Загружаем список контрагентов при открытии модалки
  useEffect(() => {
    if (open) {
      const loadCounterparties = async () => {
        const result = await getCounterparties();
        if (result.data) {
          setCounterparties(result.data);
        }
      };
      loadCounterparties();
    }
  }, [open]);

  // Обновляем форму при изменении project
  useEffect(() => {
    if (project) {
      form.reset({
        title: project.title,
        budget: project.budget || null,
        currency: project.currency || null,
        exchange_rate: project.exchange_rate || null,
        counterparty_id: project.counterparty_id || null,
      });
    } else {
      form.reset({
        title: '',
        budget: null,
        currency: null,
        exchange_rate: null,
        counterparty_id: null,
      });
    }
  }, [project, form]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', data.title);
    // Отправляем бюджет только если он указан
    if (data.budget) {
      formData.append('budget', data.budget.toString());
      formData.append('currency', data.currency || 'RUB');
    } else {
      formData.append('budget', '');
      formData.append('currency', 'none');
    }
    // Отправляем курс обмена, если он указан
    if (data.exchange_rate) {
      formData.append('exchange_rate', data.exchange_rate.toString());
    } else {
      formData.append('exchange_rate', '');
    }
    // Всегда отправляем counterparty_id, даже если это null (будет обработано в actions)
    if (data.counterparty_id) {
      formData.append('counterparty_id', data.counterparty_id);
    } else {
      // Отправляем 'none' для явного указания отсутствия контрагента
      formData.append('counterparty_id', 'none');
    }

    if (project) {
      // Редактирование существующего проекта
      formData.append('id', project.id);
      const result = await updateProject(formData);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Проект обновлен');
        onOpenChange(false);
        form.reset();
      }
    } else {
      // Создание нового проекта
      const result = await createProject(formData);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Проект создан');
        onOpenChange(false);
        form.reset();
      }
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project ? 'Редактировать проект' : 'Создать проект'}
          </DialogTitle>
          <DialogDescription>
            {project
              ? 'Измените данные проекта'
              : 'Заполните форму для создания нового проекта'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название проекта</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Разработка сайта" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Бюджет</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Не указан"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : e.target.value;
                          field.onChange(value);
                          // Если бюджет очищен, очищаем и валюту
                          if (value === null || value === '') {
                            form.setValue('currency', null);
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                      disabled={!form.watch('budget') || form.watch('budget') === null || form.watch('budget') === ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите валюту" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Не указана</SelectItem>
                        <SelectItem value="RUB">RUB</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Поле курса обмена - показываем только если валюта указана */}
            {form.watch('currency') && form.watch('currency') !== 'none' && (
              <FormField
                control={form.control}
                name="exchange_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Курс обмена RUB/USD</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Использовать курс по умолчанию"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : e.target.value;
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Курс обмена для конвертации сумм транзакций в валюту проекта.
                      Если не указан, используется курс по умолчанию из настроек.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="counterparty_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Контрагент</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите контрагента" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Не указан</SelectItem>
                      {counterparties.map((counterparty) => (
                        <SelectItem key={counterparty.id} value={counterparty.id}>
                          {counterparty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {project ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

