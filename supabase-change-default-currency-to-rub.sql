-- ============================================
-- Миграция: Изменение валюты по умолчанию с USD на RUB
-- Выполните в Supabase SQL Editor
-- ============================================
-- 
-- Изменения:
-- 1. Обновляет DEFAULT значение колонки primary_currency в таблице profiles с 'USD' на 'RUB'
-- 2. Обновляет функцию handle_new_user() для использования 'RUB' вместо 'USD' по умолчанию
-- ============================================

-- 1. Изменяем DEFAULT значение колонки primary_currency в таблице profiles
ALTER TABLE public.profiles
  ALTER COLUMN primary_currency SET DEFAULT 'RUB';

-- 2. Обновляем функцию handle_new_user() для использования RUB по умолчанию
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Вставляем профиль, обходя RLS благодаря SECURITY DEFINER
  -- Пытаемся извлечь full_name из raw_user_meta_data
  -- Если метаданные недоступны (что часто бывает), full_name будет пустым
  -- и будет обновлен кодом регистрации после создания профиля
  INSERT INTO public.profiles (id, full_name, primary_currency, is_approved)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      (NEW.raw_user_meta_data->'full_name')::text,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'primary_currency',
      'RUB'
    ),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Проверяем, что изменения применены
SELECT 
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'primary_currency';

-- ============================================
-- Готово! Валюта по умолчанию изменена на RUB
-- ============================================
-- Примечание: Существующие профили с primary_currency = 'USD' не будут изменены автоматически.
-- Если нужно обновить существующие профили, выполните:
-- UPDATE public.profiles SET primary_currency = 'RUB' WHERE primary_currency = 'USD';
-- ============================================

