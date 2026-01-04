-- Добавляем поле transaction_date в таблицу transactions
-- Это поле хранит фактическую дату транзакции, позволяя добавлять транзакции задним числом
-- По умолчанию устанавливается текущая дата

ALTER TABLE public.transactions 
ADD COLUMN transaction_date date DEFAULT CURRENT_DATE;

-- Комментарий к полю
COMMENT ON COLUMN public.transactions.transaction_date IS 'Фактическая дата транзакции. По умолчанию - текущая дата. Позволяет добавлять транзакции задним числом. При подтверждении запланированной транзакции автоматически устанавливается текущая дата.';

