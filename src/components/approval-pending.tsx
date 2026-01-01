'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert01Icon,
  Refresh01Icon,
  Logout01Icon,
} from '@hugeicons/core-free-icons';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

/**
 * Компонент-заглушка для пользователей, ожидающих одобрения
 * Показывается, когда is_approved = false
 */
export function ApprovalPending() {
  const router = useRouter();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Проверка статуса одобрения
  const handleCheckAccess = async () => {
    setIsChecking(true);
    try {
      // Получаем текущего пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Ошибка', {
          description: 'Пользователь не найден',
        });
        return;
      }

      // Проверяем статус профиля
      // Используем maybeSingle() для безопасной обработки
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        toast.error('Ошибка проверки', {
          description: error.message,
        });
        return;
      }

      if (profile?.is_approved) {
        toast.success('Доступ предоставлен!', {
          description: 'Ваш аккаунт был одобрен. Обновляем страницу...',
        });
        // Обновляем страницу, чтобы пользователь получил доступ
        router.refresh();
      } else {
        toast.info('Доступ еще не предоставлен', {
          description: 'Ваш аккаунт все еще находится на модерации.',
        });
      }
    } catch (error) {
      toast.error('Ошибка', {
        description: 'Не удалось проверить статус доступа',
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Выход из аккаунта
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Ошибка выхода', {
          description: error.message,
        });
        return;
      }

      toast.success('Вы вышли из аккаунта');
      // Перенаправляем на страницу авторизации
      router.push('/auth');
      router.refresh();
    } catch (error) {
      toast.error('Ошибка', {
        description: 'Не удалось выйти из аккаунта',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={24}
              className="text-muted-foreground"
            />
          </div>
          <CardTitle>Ожидание подтверждения</CardTitle>
          <CardDescription>
            Ваш аккаунт находится на модерации. Вы получите уведомление, как только администратор одобрит ваш аккаунт.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Пожалуйста, подождите...
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCheckAccess}
              disabled={isChecking || isLoggingOut}
              variant="default"
              className="w-full"
            >
              <HugeiconsIcon
                icon={Refresh01Icon}
                size={16}
                className={isChecking ? 'animate-spin' : ''}
              />
              {isChecking ? 'Проверка...' : 'Проверить доступ'}
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isChecking || isLoggingOut}
              variant="outline"
              className="w-full"
            >
              <HugeiconsIcon icon={Logout01Icon} size={16} />
              {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

