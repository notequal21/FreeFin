-- ============================================
-- Скрипт для исправления RLS проблемы при создании профиля
-- Выполните в Supabase SQL Editor
-- ============================================

-- 1. Удаляем старый триггер и функцию
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Создаем функцию с правильными настройками для обхода RLS
-- SECURITY DEFINER + явное отключение RLS для операции вставки
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Вставляем профиль, обходя RLS благодаря SECURITY DEFINER
  -- Функция выполняется с правами создателя, поэтому RLS не применяется
  INSERT INTO public.profiles (id, full_name, primary_currency, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'primary_currency', 'RUB'),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 3. Создаем триггер заново
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

-- 5. Проверяем политики RLS для profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. Убеждаемся, что политика INSERT существует и правильная
-- Если политика не существует, создаем её
DO $$
BEGIN
  -- Проверяем, существует ли политика INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

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

