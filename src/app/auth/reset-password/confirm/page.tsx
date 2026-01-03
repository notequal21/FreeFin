'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

// Схема валидации для установки нового пароля
const newPasswordSchema = z
  .object({
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

/**
 * Страница установки нового пароля
 * Пользователь попадает сюда по ссылке из email после запроса сброса пароля
 */
export default function ConfirmResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  // Проверяем токен из URL при загрузке страницы
  useEffect(() => {
    const checkToken = async () => {
      try {
        // Supabase автоматически обрабатывает токен из hash при загрузке страницы
        // Проверяем, есть ли токен в URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Также проверяем query params
        const tokenFromQuery = searchParams.get('token');
        const typeFromQuery = searchParams.get('type');

        // Если есть токен в hash с типом recovery, это валидная ссылка для сброса пароля
        if (accessToken && type === 'recovery') {
          // Токен валиден, можно устанавливать новый пароль
          setIsValidToken(true);
          setIsLoading(false);
        } else if (tokenFromQuery && typeFromQuery === 'recovery') {
          // Токен в query params
          setIsValidToken(true);
          setIsLoading(false);
        } else {
          // Проверяем сессию пользователя (Supabase мог автоматически установить сессию)
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            // Сессия есть, значит токен был обработан, можно устанавливать пароль
            setIsValidToken(true);
            setIsLoading(false);
          } else {
            // Токен не найден или неверный
            setIsValidToken(false);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('Ошибка проверки токена:', error);
        setIsValidToken(false);
        setIsLoading(false);
      }
    };

    checkToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onSubmit = async (data: NewPasswordFormData) => {
    try {
      // Обновляем пароль пользователя
      // Supabase автоматически обработает токен из URL
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error('Ошибка', {
          description: error.message || 'Не удалось установить новый пароль',
        });
        return;
      }

      toast.success('Пароль успешно изменен', {
        description: 'Теперь вы можете войти с новым паролем',
      });

      // Перенаправляем на страницу входа
      router.push('/auth');
    } catch (err) {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при установке нового пароля',
      });
    }
  };

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6'>
            <p className='text-center text-muted-foreground'>
              Проверка токена...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='absolute top-4 right-4'>
          <ThemeToggle />
        </div>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Неверная ссылка</CardTitle>
            <CardDescription>
              Ссылка для сброса пароля недействительна или истекла
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm text-muted-foreground'>
              Пожалуйста, запросите новую ссылку для сброса пароля.
            </p>
            <div className='flex flex-col gap-2'>
              <Button asChild className='w-full'>
                <Link href='/auth/reset-password'>Запросить новую ссылку</Link>
              </Button>
              <Button asChild variant='outline' className='w-full'>
                <Link href='/auth'>Вернуться к входу</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <div className='absolute top-4 right-4'>
        <ThemeToggle />
      </div>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Установка нового пароля</CardTitle>
          <CardDescription>
            Введите новый пароль для вашего аккаунта
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='password'>Новый пароль</Label>
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

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Подтвердите пароль</Label>
              <Input
                id='confirmPassword'
                type='password'
                {...register('confirmPassword')}
                placeholder='••••••••'
              />
              {errors.confirmPassword && (
                <p className='text-sm text-destructive'>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type='submit' disabled={isSubmitting} className='w-full'>
              {isSubmitting ? 'Сохранение...' : 'Установить новый пароль'}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              <Link
                href='/auth'
                className='font-medium text-primary hover:underline'
              >
                Вернуться к входу
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
