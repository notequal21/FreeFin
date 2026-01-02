'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCategory, updateCategory } from '@/app/settings/categories/actions';
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
import { useEffect } from 'react';

// Схема валидации для формы категории
const categorySchema = z.object({
  name: z.string().min(1, 'Название категории обязательно'),
  type: z.enum(['income', 'expense'], {
    message: 'Тип должен быть income или expense',
  }),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: {
    id: string;
    name: string;
    type: 'income' | 'expense';
  } | null;
}

/**
 * Модалка для создания или редактирования категории
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      type: 'expense',
    },
  });

  // Обновляем форму при изменении category
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        type: category.type,
      });
    } else {
      form.reset({
        name: '',
        type: 'expense',
      });
    }
  }, [category, form]);

  const onSubmit = async (data: CategoryFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('type', data.type);

    if (category) {
      // Редактирование существующей категории
      formData.append('id', category.id);
      const result = await updateCategory(formData);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Категория обновлена');
        onOpenChange(false);
        form.reset();
      }
    } else {
      // Создание новой категории
      const result = await createCategory(formData);

      if (result.error) {
        toast.error('Ошибка', {
          description: result.error,
        });
      } else {
        toast.success('Категория создана');
        onOpenChange(false);
        form.reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Редактировать категорию' : 'Создать категорию'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Измените данные категории'
              : 'Заполните форму для создания новой категории'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название категории</FormLabel>
                  <FormControl>
                    <Input placeholder="Например: Продукты" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип категории</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Доход</SelectItem>
                      <SelectItem value="expense">Расход</SelectItem>
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
              >
                Отмена
              </Button>
              <Button type="submit">
                {category ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

