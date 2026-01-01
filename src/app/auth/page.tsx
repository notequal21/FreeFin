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

// Схема валидации для формы входа
const signInSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

type SignInFormData = z.infer<typeof signInSchema>;

/**
 * Страница авторизации
 * Позволяет пользователю войти в систему
 */
export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error('Ошибка входа', {
          description: error.message,
        });
        return;
      }

      toast.success('Успешный вход!', {
        description: 'Добро пожаловать обратно',
      });

      // Перенаправляем на главную страницу после успешного входа
      router.push('/');
      router.refresh();
    } catch (err) {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при входе',
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
          <CardTitle>Вход в систему</CardTitle>
          <CardDescription>
            Введите свои учетные данные для входа
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

            <div className='space-y-2'>
              <Label htmlFor='password'>Пароль</Label>
              <Input
                id='password'
                type='password'
                {...register('password')}
                placeholder='••••••••'
              />
              {errors.password && (
                <p className='text-sm text-destructive'>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type='submit' disabled={isSubmitting} className='w-full'>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              Нет аккаунта?{' '}
              <Link
                href='/auth/register'
                className='font-medium text-primary hover:underline'
              >
                Зарегистрироваться
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
