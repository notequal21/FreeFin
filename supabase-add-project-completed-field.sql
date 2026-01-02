-- Добавление поля is_completed в таблицу projects
-- Поле используется для пометки завершенных проектов

-- Добавляем поле is_completed (boolean, по умолчанию false)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false NOT NULL;

-- Комментарий к полю
COMMENT ON COLUMN public.projects.is_completed IS 'Флаг завершения проекта. Если true, проект считается завершенным и не отображается в списке активных проектов.';

