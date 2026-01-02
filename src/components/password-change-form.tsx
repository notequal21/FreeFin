'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

// Схема валидации для смены пароля
const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Введите текущий пароль'),
  new_password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  confirm_password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Пароли не совпадают',
  path: ['confirm_password'],
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

/**
 * Форма для смены пароля пользователя
 * Использует клиентский клиент Supabase для обновления пароля
 * Требует подтверждения текущего пароля для дополнительной безопасности
 */
export function PasswordChangeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const form = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: PasswordChangeFormData) => {
    setIsSubmitting(true);

    try {
      // Сначала проверяем текущий пароль, пытаясь войти с ним
      // Получаем email текущего пользователя
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        toast.error('Ошибка', {
          description: 'Не удалось получить данные пользователя',
        });
        setIsSubmitting(false);
        return;
      }

      // Проверяем текущий пароль, пытаясь войти с ним
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.current_password,
      });

      if (signInError) {
        toast.error('Ошибка', {
          description: 'Неверный текущий пароль',
        });
        setIsSubmitting(false);
        form.setError('current_password', {
          type: 'manual',
          message: 'Неверный текущий пароль',
        });
        return;
      }

      // Если текущий пароль верный, обновляем на новый
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.new_password,
      });

      if (updateError) {
        toast.error('Ошибка', {
          description: updateError.message,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success('Пароль успешно изменен');
      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при изменении пароля',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="current_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Текущий пароль</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Введите текущий пароль"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Введите текущий пароль для подтверждения
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="new_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Новый пароль</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Введите новый пароль"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Пароль должен содержать минимум 6 символов
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Подтвердите новый пароль</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Повторите новый пароль"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Изменить пароль'}
        </Button>
      </form>
    </Form>
  );
}

