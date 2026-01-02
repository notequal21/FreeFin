-- Миграция: Добавление поля counterparty_id в таблицу projects
-- Дата: 2024
-- Описание: Добавляет возможность привязывать контрагента к проекту

-- Добавляем поле counterparty_id в таблицу projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS counterparty_id uuid;

-- Добавляем внешний ключ для связи с таблицей counterparties
ALTER TABLE public.projects
ADD CONSTRAINT projects_counterparty_id_fkey 
FOREIGN KEY (counterparty_id) 
REFERENCES public.counterparties(id) 
ON DELETE SET NULL;

-- Комментарий к полю
COMMENT ON COLUMN public.projects.counterparty_id IS 'Ссылка на контрагента (NULL, если контрагент не указан)';

