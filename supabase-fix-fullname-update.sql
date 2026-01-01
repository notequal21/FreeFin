-- ============================================
-- Скрипт для создания функции обновления full_name
-- Выполните в Supabase SQL Editor
-- ============================================
-- 
-- Проблема: После регистрации full_name может не обновиться из-за RLS,
-- особенно если пользователь не полностью аутентифицирован (email confirmation).
-- Решение: Создаем функцию с SECURITY DEFINER для обновления full_name,
-- которая обходит RLS и может быть вызвана из клиентского кода.
-- ============================================

-- Функция для обновления full_name в профиле пользователя
-- Использует SECURITY DEFINER для обхода RLS, но проверяет, что пользователь обновляет только свой профиль
CREATE OR REPLACE FUNCTION public.update_user_full_name(
  user_id uuid,
  new_full_name text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Проверяем, что пользователь обновляет только свой собственный профиль
  IF auth.uid() IS NULL OR auth.uid() != user_id THEN
    RAISE EXCEPTION 'Можно обновлять только свой собственный профиль';
  END IF;
  
  -- Обновляем full_name в профиле, обходя RLS благодаря SECURITY DEFINER
  UPDATE public.profiles
  SET full_name = new_full_name,
      updated_at = now()
  WHERE id = user_id;
  
  -- Если профиль не существует, создаем его
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, full_name, primary_currency, is_approved)
    VALUES (user_id, new_full_name, 'RUB', false)
    ON CONFLICT (id) DO UPDATE
    SET full_name = new_full_name,
        updated_at = now();
  END IF;
END;
$$;

-- Предоставляем права на выполнение функции аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION public.update_user_full_name(uuid, text) TO authenticated;

-- ============================================
-- Готово! Функция создана
-- ============================================
-- Теперь можно вызывать эту функцию из клиентского кода:
-- SELECT public.update_user_full_name('user_id', 'Имя Фамилия');
-- ============================================

