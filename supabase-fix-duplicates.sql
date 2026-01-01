-- ============================================
-- Скрипт для проверки и исправления дубликатов профилей
-- Выполните в Supabase SQL Editor
-- ============================================

-- 1. Проверяем, есть ли дубликаты профилей
SELECT 
  id,
  COUNT(*) as count
FROM public.profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- 2. Если есть дубликаты, оставляем только один профиль (самый свежий)
-- Удаляем дубликаты, оставляя только последний созданный профиль
DELETE FROM public.profiles
WHERE id IN (
  SELECT id
  FROM public.profiles
  GROUP BY id
  HAVING COUNT(*) > 1
)
AND updated_at NOT IN (
  SELECT MAX(updated_at)
  FROM public.profiles
  GROUP BY id
  HAVING COUNT(*) > 1
);

-- 3. Альтернативный способ: если нужно оставить профиль с is_approved = true
-- (если один из дубликатов одобрен, а другой нет)
DELETE FROM public.profiles p1
WHERE EXISTS (
  SELECT 1
  FROM public.profiles p2
  WHERE p1.id = p2.id
  AND (
    (p1.is_approved = false AND p2.is_approved = true)
    OR (p1.is_approved = p2.is_approved AND p1.updated_at < p2.updated_at)
  )
);

-- 4. Убеждаемся, что нет дубликатов (должно вернуть пустой результат)
SELECT 
  id,
  COUNT(*) as count
FROM public.profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- 5. Проверяем все профили
SELECT 
  id,
  full_name,
  is_approved,
  primary_currency,
  updated_at
FROM public.profiles
ORDER BY updated_at DESC;

