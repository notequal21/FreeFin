# Настройка проекта на Vercel

## Переменные окружения

Для работы приложения на Vercel необходимо установить следующие переменные окружения:

1. Перейдите в настройки проекта на Vercel
2. Откройте раздел **Settings** → **Environment Variables**
3. Добавьте следующие переменные:

### Обязательные переменные:

- `NEXT_PUBLIC_SUPABASE_URL` - URL вашего проекта Supabase
  - Пример: `https://xxxxx.supabase.co`
  - Найти можно в настройках проекта Supabase: Settings → API → Project URL

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon (public) ключ Supabase
  - Пример: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Найти можно в настройках проекта Supabase: Settings → API → Project API keys → anon public

### Как найти переменные в Supabase:

1. Войдите в [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Скопируйте:
   - **Project URL** → это `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** ключ → это `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### После добавления переменных:

1. Перезапустите деплой на Vercel (или дождитесь автоматического перезапуска)
2. Проверьте логи деплоя в разделе **Deployments** на Vercel
3. Если ошибка сохраняется, проверьте логи в разделе **Functions** → **Logs**

## Проверка подключения

После настройки переменных окружения приложение должно успешно подключиться к Supabase. Если ошибка сохраняется:

1. Убедитесь, что переменные окружения установлены для всех окружений (Production, Preview, Development)
2. Проверьте, что значения переменных скопированы полностью (без пробелов в начале/конце)
3. Убедитесь, что проект Supabase активен и доступен

