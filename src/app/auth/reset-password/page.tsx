'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

// Схема валидации для запроса сброса пароля
const resetPasswordSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Страница запроса сброса пароля
 * Позволяет пользователю запросить сброс пароля по email
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      // Получаем текущий URL для redirect после сброса пароля
      const redirectTo = `${window.location.origin}/auth/reset-password/confirm`;

      // Отправляем письмо с ссылкой для сброса пароля
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });

      if (error) {
        toast.error('Ошибка', {
          description: error.message,
        });
        return;
      }

      // Показываем успешное сообщение (даже если email не существует, для безопасности)
      toast.success('Письмо отправлено', {
        description: 'Если аккаунт с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля',
      });

      // Опционально: перенаправляем на страницу входа через несколько секунд
      setTimeout(() => {
        router.push('/auth');
      }, 3000);
    } catch (err) {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при отправке письма',
      });
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Сброс пароля</CardTitle>
          <CardDescription>
            Введите ваш email адрес, и мы отправим вам инструкции по сбросу пароля
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                {...register('email')}
                placeholder='your@email.com'
              />
              {errors.email && (
                <p className='text-sm text-destructive'>
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button type='submit' disabled={isSubmitting} className='w-full'>
              {isSubmitting ? 'Отправка...' : 'Отправить инструкции'}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              Вспомнили пароль?{' '}
              <Link
                href='/auth'
                className='font-medium text-primary hover:underline'
              >
                Войти
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

