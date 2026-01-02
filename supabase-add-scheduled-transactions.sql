-- Добавление полей для запланированных транзакций
-- is_scheduled: флаг запланированной транзакции
-- scheduled_date: дата платежа (информационное поле, пока без функционала автоматического подтверждения)

ALTER TABLE public.transactions
ADD COLUMN is_scheduled boolean DEFAULT false NOT NULL,
ADD COLUMN scheduled_date date;

-- Комментарии к полям
COMMENT ON COLUMN public.transactions.is_scheduled IS 'Флаг запланированной транзакции. Если true, транзакция является запланированной и требует ручного подтверждения.';
COMMENT ON COLUMN public.transactions.scheduled_date IS 'Дата платежа для запланированной транзакции. Пока используется только в информационных целях.';

