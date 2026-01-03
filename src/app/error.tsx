'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логируем ошибку для отладки
    console.error('Application error:', error);
  }, [error]);

  const isEnvError = error.message?.includes('переменные окружения') || 
                     error.message?.includes('NEXT_PUBLIC_SUPABASE');

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <CardTitle>Ошибка приложения</CardTitle>
          </div>
          <CardDescription>
            Произошла ошибка при загрузке приложения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEnvError ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Не настроены переменные окружения для Supabase.
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Пожалуйста, проверьте настройки проекта на Vercel и убедитесь, что установлены:
              </p>
              <ul className="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1 ml-2">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
              </ul>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Подробные инструкции см. в файле VERCEL_SETUP.md
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {error.message || 'Произошла неизвестная ошибка'}
              </p>
              {error.digest && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Попробовать снова
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

