-- ============================================
-- Миграция: Исключение запланированных транзакций из баланса
-- Описание: Обновляет функцию update_account_balance() чтобы игнорировать транзакции с is_scheduled = true
-- Дата: 2024
-- ============================================

-- Обновляем функцию для автоматического обновления баланса счета
-- Теперь она игнорирует запланированные транзакции (is_scheduled = true)
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
  -- ИСКЛЮЧАЕМ запланированные транзакции (is_scheduled = true) из расчета баланса
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
      AND is_scheduled = false  -- Исключаем запланированные транзакции
  ), 0)
  WHERE id = target_account_id;

  -- При UPDATE также нужно обновить баланс старого счета (если account_id изменился)
  -- ВАЖНО: Используем converted_amount (сумма в валюте счета), а не amount (сумма в валюте транзакции)
  -- ИСКЛЮЧАЕМ запланированные транзакции (is_scheduled = true) из расчета баланса
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
        AND is_scheduled = false  -- Исключаем запланированные транзакции
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

-- Обновляем триггер: добавляем is_scheduled в список полей, при изменении которых срабатывает триггер
-- Это необходимо, чтобы при подтверждении запланированной транзакции (is_scheduled меняется с true на false)
-- баланс счета пересчитывался автоматически
DROP TRIGGER IF EXISTS update_account_balance ON public.transactions;

CREATE TRIGGER update_account_balance
  AFTER INSERT OR UPDATE OF amount, exchange_rate, type, account_id, is_scheduled OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Пересчитываем балансы всех существующих счетов
-- ИСКЛЮЧАЕМ запланированные транзакции (is_scheduled = true) из расчета баланса
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
    AND is_scheduled = false  -- Исключаем запланированные транзакции
), 0);

-- ============================================
-- Готово! Запланированные транзакции теперь не влияют на баланс счетов
-- При подтверждении транзакции (is_scheduled меняется с true на false) баланс пересчитывается автоматически
-- ============================================

