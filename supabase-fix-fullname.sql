-- ============================================
-- Скрипт для исправления проблемы с full_name при регистрации
-- Выполните в Supabase SQL Editor
-- ============================================
-- 
-- Проблема: Метаданные могут быть недоступны в момент срабатывания триггера,
-- поэтому full_name может быть пустым при создании профиля.
-- Решение: Улучшен триггер и код регистрации гарантированно обновляет full_name
-- после создания профиля.
-- ============================================

-- 1. Обновляем функцию handle_new_user() для более надежного извлечения метаданных
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

-- 2. Проверяем, что триггер существует
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 3. Если нужно обновить существующие профили с пустым full_name,
-- можно выполнить следующий запрос (раскомментируйте при необходимости):
-- UPDATE public.profiles
-- SET full_name = COALESCE(
--   (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = profiles.id),
--   ''
-- )
-- WHERE full_name IS NULL OR full_name = '';

-- ============================================
-- Готово! Триггер обновлен
-- ============================================
-- Теперь код регистрации гарантированно обновит full_name после создания профиля,
-- даже если триггер создал профиль с пустым значением.
-- ============================================

