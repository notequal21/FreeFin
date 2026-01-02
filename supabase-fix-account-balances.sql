-- ============================================
-- Миграция: Исправление балансов счетов
-- Описание: Пересчитывает балансы всех счетов на основе транзакций
-- Дата: 2024
-- ============================================

-- Создаем функцию для обновления баланса счета (если еще не создана)
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_account_id uuid;
BEGIN
  -- Определяем, какой счет нужно обновить
  -- При INSERT/UPDATE используем NEW.account_id
  -- При DELETE используем OLD.account_id
  IF TG_OP = 'DELETE' THEN
    target_account_id := OLD.account_id;
  ELSE
    target_account_id := NEW.account_id;
  END IF;

  -- Пересчитываем баланс счета на основе всех транзакций
  -- ВАЖНО: Используем converted_amount (сумма в валюте счета), а не amount (сумма в валюте транзакции)
  -- income увеличивает баланс, expense и withdrawal уменьшают
  UPDATE public.accounts
  SET balance = COALESCE((
    SELECT SUM(
      CASE 
        WHEN type = 'income' THEN converted_amount
        WHEN type IN ('expense', 'withdrawal') THEN -converted_amount
        ELSE 0
      END
    )
    FROM public.transactions
    WHERE account_id = target_account_id
  ), 0)
  WHERE id = target_account_id;

  -- При UPDATE также нужно обновить баланс старого счета (если account_id изменился)
  -- ВАЖНО: Используем converted_amount (сумма в валюте счета), а не amount (сумма в валюте транзакции)
  IF TG_OP = 'UPDATE' AND OLD.account_id != NEW.account_id THEN
    UPDATE public.accounts
    SET balance = COALESCE((
      SELECT SUM(
        CASE 
          WHEN type = 'income' THEN converted_amount
          WHEN type IN ('expense', 'withdrawal') THEN -converted_amount
          ELSE 0
        END
      )
      FROM public.transactions
      WHERE account_id = OLD.account_id
    ), 0)
    WHERE id = OLD.account_id;
  END IF;

  -- Возвращаем соответствующую запись
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Создаем триггер для автоматического обновления баланса (если еще не создан)
-- ВАЖНО: Триггер должен срабатывать при изменении amount, exchange_rate, type, account_id
-- так как изменение exchange_rate пересчитывает converted_amount, что влияет на баланс
DROP TRIGGER IF EXISTS update_account_balance ON public.transactions;

CREATE TRIGGER update_account_balance
  AFTER INSERT OR UPDATE OF amount, exchange_rate, type, account_id OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Пересчитываем балансы всех существующих счетов
-- ВАЖНО: Используем converted_amount (сумма в валюте счета), а не amount (сумма в валюте транзакции)
-- income увеличивает баланс, expense и withdrawal уменьшают
UPDATE public.accounts
SET balance = COALESCE((
  SELECT SUM(
    CASE 
      WHEN type = 'income' THEN converted_amount
      WHEN type IN ('expense', 'withdrawal') THEN -converted_amount
      ELSE 0
    END
  )
  FROM public.transactions
  WHERE transactions.account_id = accounts.id
), 0);

-- ============================================
-- Готово! Все балансы пересчитаны
-- ============================================

