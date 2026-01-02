-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Для полной инициализации используйте supabase-init.sql

-- Таблица profiles (профили пользователей)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  primary_currency text DEFAULT 'RUB' CHECK (primary_currency = ANY (ARRAY['USD', 'RUB'])),
  is_approved boolean DEFAULT false,
  default_exchange_rate numeric DEFAULT 100 CHECK (default_exchange_rate > 0),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Таблица accounts (счета/кошельки)
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  currency text CHECK (currency = ANY (ARRAY['USD', 'RUB'])),
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Таблица categories (категории)
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid, -- NULL для общих категорий, uuid для приватных
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['income', 'expense'])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Таблица projects (проекты)
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  budget numeric, -- Бюджет проекта (NULL, если не указан)
  currency text CHECK (currency = ANY (ARRAY['USD', 'RUB'])), -- Валюта бюджета (NULL, если бюджет не указан)
  exchange_rate numeric CHECK (exchange_rate > 0), -- Курс обмена RUB/USD для проекта (NULL, если используется курс по умолчанию)
  counterparty_id uuid, -- Ссылка на контрагента (NULL, если контрагент не указан)
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT projects_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties(id) ON DELETE SET NULL
);

-- Таблица counterparties (контрагенты)
CREATE TABLE public.counterparties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text CHECK (type = ANY (ARRAY['client', 'contractor'])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT counterparties_pkey PRIMARY KEY (id),
  CONSTRAINT counterparties_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Таблица transactions (транзакции)
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid, -- Ссылка на категорию (исправлено: было category text)
  project_id uuid,
  counterparty_id uuid,
  amount numeric NOT NULL,
  exchange_rate numeric DEFAULT 1,
  converted_amount numeric, -- Вычисляется триггером
  project_exchange_rate numeric, -- Курс обмена от primary_currency к валюте проекта на момент создания транзакции
  type text NOT NULL CHECK (type = ANY (ARRAY['income', 'expense', 'withdrawal'])),
  tags text[],
  description text,
  is_scheduled boolean DEFAULT false NOT NULL, -- Флаг запланированной транзакции
  scheduled_date date, -- Дата платежа для запланированной транзакции (информационное поле)
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
  CONSTRAINT transactions_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties(id) ON DELETE SET NULL
);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;

-- Политики для profiles
-- Пользователь может создавать свой собственный профиль
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Пользователь может читать свой профиль (даже если is_approved = false)
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Пользователь может обновлять свой профиль
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Политики для accounts
-- Доступ только если is_approved = true и user_id = auth.uid()
CREATE POLICY "Users can manage accounts if approved"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  );

-- Политики для categories
-- Общие категории (user_id IS NULL) доступны всем одобренным пользователям
-- Приватные категории доступны только владельцу, если он одобрен
CREATE POLICY "Users can view categories if approved"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND (
      user_id IS NULL -- Общие категории
      OR user_id = auth.uid() -- Приватные категории пользователя
    )
  );

CREATE POLICY "Users can manage own categories if approved"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  );

-- Политики для transactions
-- Доступ только если is_approved = true и user_id = auth.uid()
CREATE POLICY "Users can manage transactions if approved"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  );

-- Политики для projects
-- Доступ только если is_approved = true и user_id = auth.uid()
CREATE POLICY "Users can manage projects if approved"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  );

-- Политики для counterparties
-- Доступ только если is_approved = true и user_id = auth.uid()
CREATE POLICY "Users can manage counterparties if approved"
  ON public.counterparties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_approved = true
    )
    AND user_id = auth.uid()
  );

-- ============================================
-- Триггеры и Функции
-- ============================================

-- Функция для автоматического создания профиля при регистрации
-- SECURITY DEFINER позволяет функции обходить RLS при создании профиля
-- Функция выполняется с правами создателя, поэтому RLS не применяется
-- ВАЖНО: Метаданные могут быть недоступны в момент срабатывания триггера,
-- поэтому full_name может быть пустым. Код регистрации обновит его после создания профиля.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Вставляем профиль, обходя RLS благодаря SECURITY DEFINER
  -- Пытаемся извлечь full_name из raw_user_meta_data
  -- Если метаданные недоступны (что часто бывает), full_name будет пустым
  -- и будет обновлен кодом регистрации после создания профиля
  INSERT INTO public.profiles (id, full_name, primary_currency, is_approved)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      (NEW.raw_user_meta_data->'full_name')::text,
      ''
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'primary_currency',
      'RUB'
    ),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Триггер: автоматически создает профиль при создании пользователя в auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Функция для автоматического вычисления converted_amount
-- ВАЖНО: При UPDATE exchange_rate для существующей транзакции сохраняет старое значение converted_amount,
-- фиксируя конвертированную сумму в момент создания транзакции
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

-- Триггер: автоматически вычисляет converted_amount при INSERT/UPDATE
CREATE TRIGGER calculate_converted_amount
  BEFORE INSERT OR UPDATE OF amount, exchange_rate ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_converted_amount();

-- Функция для автоматического обновления баланса счета
-- Пересчитывает баланс на основе всех транзакций счета
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

-- Триггер: автоматически обновляет баланс счета при изменении транзакций
-- ВАЖНО: Триггер должен срабатывать при изменении amount, exchange_rate, type, account_id, is_scheduled
-- так как изменение exchange_rate пересчитывает converted_amount, что влияет на баланс
-- изменение is_scheduled необходимо для пересчета баланса при подтверждении запланированной транзакции
CREATE TRIGGER update_account_balance
  AFTER INSERT OR UPDATE OF amount, exchange_rate, type, account_id, is_scheduled OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Функция для обновления full_name в профиле пользователя
-- Использует SECURITY DEFINER для обхода RLS, но проверяет, что пользователь обновляет только свой профиль
-- Эта функция используется в коде регистрации для гарантированного обновления full_name
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