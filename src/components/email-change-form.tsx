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
import { useState, useEffect } from 'react';

// Схема валидации для смены email
const emailChangeSchema = z.object({
  new_email: z.string().email('Некорректный email адрес'),
  password: z.string().min(1, 'Введите пароль для подтверждения'),
});

type EmailChangeFormData = z.infer<typeof emailChangeSchema>;

/**
 * Форма для смены email пользователя
 * Использует клиентский клиент Supabase для обновления email
 * Требует подтверждения пароля и отправляет письма на старый и новый email
 */
export function EmailChangeForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const supabase = createClient();

  // Получаем текущий email пользователя
  useEffect(() => {
    const getCurrentEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentEmail(user.email);
      }
    };
    getCurrentEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<EmailChangeFormData>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      new_email: '',
      password: '',
    },
  });

  const onSubmit = async (data: EmailChangeFormData) => {
    setIsSubmitting(true);

    try {
      // Получаем текущего пользователя
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        toast.error('Ошибка', {
          description: 'Не удалось получить данные пользователя',
        });
        setIsSubmitting(false);
        return;
      }

      // Проверяем, что новый email отличается от текущего
      if (data.new_email === user.email) {
        toast.error('Ошибка', {
          description: 'Новый email должен отличаться от текущего',
        });
        setIsSubmitting(false);
        form.setError('new_email', {
          type: 'manual',
          message: 'Новый email должен отличаться от текущего',
        });
        return;
      }

      // Проверяем пароль, пытаясь войти с ним
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.password,
      });

      if (signInError) {
        toast.error('Ошибка', {
          description: 'Неверный пароль',
        });
        setIsSubmitting(false);
        form.setError('password', {
          type: 'manual',
          message: 'Неверный пароль',
        });
        return;
      }

      // Если пароль верный, обновляем email
      // Supabase автоматически отправит письма на старый и новый email
      const { error: updateError } = await supabase.auth.updateUser({
        email: data.new_email,
      });

      if (updateError) {
        toast.error('Ошибка', {
          description: updateError.message,
        });
        setIsSubmitting(false);
        return;
      }

      // Успешно инициирована смена email
      toast.success('Запрос на смену email отправлен', {
        description:
          'Проверьте почту на старом и новом адресе для подтверждения',
      });

      form.reset();
      setIsSubmitting(false);
    } catch (error) {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при изменении email',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {currentEmail && (
          <div className='rounded-md bg-muted p-3'>
            <p className='text-sm text-muted-foreground'>
              Текущий email: <span className='font-medium'>{currentEmail}</span>
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name='new_email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Новый email</FormLabel>
              <FormControl>
                <Input type='email' placeholder='new@email.com' {...field} />
              </FormControl>
              <FormDescription>
                На этот адрес будет отправлено письмо для подтверждения
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Введите пароль для подтверждения'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Введите текущий пароль для подтверждения смены email
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950'>
          <p className='text-sm text-blue-800 dark:text-blue-200'>
            <strong>Важно:</strong> После отправки формы на старый и новый email
            будут отправлены письма с подтверждением. Email будет изменен только
            после подтверждения в обоих письмах.
          </p>
        </div>

        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? 'Отправка...' : 'Изменить email'}
        </Button>
      </form>
    </Form>
  );
}
