'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ThemeToggle } from '@/components/theme-toggle';
import { toast } from 'sonner';

// Схема валидации для формы регистрации
const signUpSchema = z
  .object({
    fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа'),
    email: z.string().email('Некорректный email адрес'),
    password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

/**
 * Страница регистрации
 * Позволяет пользователю создать новый аккаунт
 */
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      // Регистрируем пользователя с передачей ФИО в метаданные
      // ФИО будет доступно триггеру через raw_user_meta_data
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
            },
          },
        }
      );

      if (signUpError) {
        toast.error('Ошибка регистрации', {
          description: signUpError.message,
        });
        return;
      }

      // Если регистрация успешна и есть пользователь, ждем создания профиля триггером
      // Профиль создается автоматически триггером handle_new_user()
      // Затем обновляем full_name, если профиль уже создан
      if (authData.user) {
        // Ждем, чтобы триггер успел создать профиль
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Пытаемся обновить full_name в профиле (если он уже создан триггером)
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: data.fullName })
          .eq('id', authData.user.id);

        // Если профиль еще не создан (триггер не сработал), создаем вручную
        if (updateError) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              full_name: data.fullName,
              is_approved: false,
            });

          if (insertError) {
            toast.error('Ошибка создания профиля', {
              description: insertError.message,
            });
            return;
          }
        }
      }

      toast.success('Регистрация успешна!', {
        description: 'Добро пожаловать!',
      });

      // Перенаправляем на главную страницу после успешной регистрации
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Ошибка', {
        description: 'Произошла ошибка при регистрации',
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
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>
            Создайте новый аккаунт для начала работы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='fullName'
                render={({ field, fieldState }) => (
                  <FormItem name='fullName' error={fieldState.error}>
                    <FormLabel>ФИО</FormLabel>
                    <FormControl>
                      <Input type='text' placeholder='Иван Иванов' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='email'
                render={({ field, fieldState }) => (
                  <FormItem name='email' error={fieldState.error}>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type='email'
                        placeholder='your@email.com'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field, fieldState }) => (
                  <FormItem name='password' error={fieldState.error}>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='••••••••'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field, fieldState }) => (
                  <FormItem name='confirmPassword' error={fieldState.error}>
                    <FormLabel>Подтвердите пароль</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        placeholder='••••••••'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type='submit'
                disabled={form.formState.isSubmitting}
                className='w-full'
              >
                {form.formState.isSubmitting
                  ? 'Регистрация...'
                  : 'Зарегистрироваться'}
              </Button>

              <div className='text-center text-sm text-muted-foreground'>
                Уже есть аккаунт?{' '}
                <Link
                  href='/auth'
                  className='font-medium text-primary hover:underline'
                >
                  Войти
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
