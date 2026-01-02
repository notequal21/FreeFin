-- ============================================
-- Миграция: Исправление триггера calculate_converted_amount
-- Описание: Фиксирует converted_amount при создании транзакции,
-- не пересчитывает при обновлении exchange_rate (если транзакция уже существует)
-- Дата: 2026-01-02
-- ============================================

-- Обновляем функцию calculate_converted_amount
-- Логика: пересчитываем converted_amount только при INSERT или при изменении amount
-- При UPDATE exchange_rate для существующей транзакции не пересчитываем converted_amount
CREATE OR REPLACE FUNCTION public.calculate_converted_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- При INSERT всегда вычисляем converted_amount
  IF TG_OP = 'INSERT' THEN
    NEW.converted_amount := NEW.amount * COALESCE(NEW.exchange_rate, 1);
  ELSIF TG_OP = 'UPDATE' THEN
    -- При UPDATE пересчитываем converted_amount только если изменился amount
    -- Если изменился только exchange_rate, сохраняем старое значение converted_amount
    -- Это позволяет фиксировать конвертированную сумму в момент создания транзакции
    IF OLD.amount IS DISTINCT FROM NEW.amount THEN
      -- Если изменился amount, пересчитываем converted_amount
      NEW.converted_amount := NEW.amount * COALESCE(NEW.exchange_rate, 1);
    ELSE
      -- Если изменился только exchange_rate, сохраняем старое значение converted_amount
      -- Это фиксирует конвертированную сумму в момент создания транзакции
      NEW.converted_amount := OLD.converted_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Комментарий к функции
COMMENT ON FUNCTION public.calculate_converted_amount() IS 'Вычисляет converted_amount при создании транзакции. При обновлении exchange_rate для существующей транзакции сохраняет старое значение converted_amount, фиксируя конвертированную сумму в момент создания.';

