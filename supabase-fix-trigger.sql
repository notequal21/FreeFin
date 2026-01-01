-- ============================================
-- Скрипт для проверки и исправления триггера создания профиля
-- Выполните в Supabase SQL Editor
-- ============================================

-- 1. Проверяем, существует ли триггер
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 2. Проверяем, существует ли функция
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- 3. Если триггер не существует или работает неправильно, пересоздаем его

-- Удаляем старый триггер (если существует)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Удаляем старую функцию (если существует)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Создаем функцию заново
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Вставляем профиль с явным указанием is_approved = false
  INSERT INTO public.profiles (id, full_name, primary_currency, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'primary_currency', 'RUB'),
    false  -- Явно указываем, что пользователь не одобрен
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Создаем триггер заново
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Проверяем, что триггер создан
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5. Проверяем существующие профили без is_approved = false
-- (на случай, если были созданы профили с другими значениями)
UPDATE public.profiles
SET is_approved = false
WHERE is_approved IS NULL;

-- 6. Убеждаемся, что все существующие профили имеют is_approved = false по умолчанию
-- (если это не было установлено при создании)
ALTER TABLE public.profiles
  ALTER COLUMN is_approved SET DEFAULT false;

-- 7. Проверяем существующие профили
SELECT 
  id,
  full_name,
  is_approved,
  primary_currency,
  updated_at
FROM public.profiles
ORDER BY updated_at DESC
LIMIT 10;

