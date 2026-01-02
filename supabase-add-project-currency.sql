-- Миграция: Добавление поля currency в таблицу projects и изменение budget на nullable
-- Дата: 2024
-- Описание: Добавляет поле валюты для бюджета проекта и делает бюджет необязательным

-- Делаем поле budget nullable (если оно еще не nullable)
ALTER TABLE public.projects
ALTER COLUMN budget DROP NOT NULL;

-- Удаляем значение по умолчанию для budget
ALTER TABLE public.projects
ALTER COLUMN budget DROP DEFAULT;

-- Добавляем поле currency в таблицу projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS currency text CHECK (currency = ANY (ARRAY['USD', 'RUB']));

-- Комментарий к полю
COMMENT ON COLUMN public.projects.currency IS 'Валюта бюджета (NULL, если бюджет не указан)';
COMMENT ON COLUMN public.projects.budget IS 'Бюджет проекта (NULL, если не указан)';

