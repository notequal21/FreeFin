-- ============================================
-- Полная инициализация БД для freefin
-- ВНИМАНИЕ: Этот скрипт удаляет все существующие таблицы, функции и триггеры!
-- Выполните в Supabase SQL Editor
-- ============================================

-- ============================================
-- ШАГ 1: Удаление существующих объектов
-- ============================================

-- Удаляем триггеры (все возможные варианты имен)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS calculate_converted_amount ON public.transactions;
DROP TRIGGER IF EXISTS tr_calculate_conversion ON public.transactions;

-- Удаляем функции с CASCADE (автоматически удалит зависимые триггеры)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_converted_amount() CASCADE;

-- Удаляем таблицы (в правильном порядке из-за внешних ключей)
-- CASCADE автоматически удалит все политики RLS, триггеры и зависимости
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.counterparties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- ШАГ 2: Создание таблиц
-- ============================================

-- Таблица profiles (профили пользователей)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  primary_currency text DEFAULT 'RUB' CHECK (primary_currency = ANY (ARRAY['USD', 'RUB'])),
  is_approved boolean DEFAULT false,
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
  budget numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
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
  category_id uuid, -- Ссылка на категорию
  project_id uuid,
  counterparty_id uuid,
  amount numeric NOT NULL,
  exchange_rate numeric DEFAULT 1,
  converted_amount numeric, -- Вычисляется триггером
  type text NOT NULL CHECK (type = ANY (ARRAY['income', 'expense', 'withdrawal'])),
  tags text[],
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE,
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL,
  CONSTRAINT transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
  CONSTRAINT transactions_counterparty_id_fkey FOREIGN KEY (counterparty_id) REFERENCES public.counterparties(id) ON DELETE SET NULL
);

-- ============================================
-- ШАГ 3: Включение Row Level Security (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterparties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ШАГ 4: Создание RLS политик
-- ============================================

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
-- ШАГ 5: Создание функций и триггеров
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
  -- Пытаемся извлечь full_name из raw_user_meta_data или user_metadata
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
CREATE OR REPLACE FUNCTION public.calculate_converted_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Вычисляем converted_amount = amount * exchange_rate
  NEW.converted_amount := NEW.amount * COALESCE(NEW.exchange_rate, 1);
  RETURN NEW;
END;
$$;

-- Триггер: автоматически вычисляет converted_amount при INSERT/UPDATE
CREATE TRIGGER calculate_converted_amount
  BEFORE INSERT OR UPDATE OF amount, exchange_rate ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_converted_amount();

-- ============================================
-- ШАГ 6: Создание индексов для оптимизации
-- ============================================

-- Индексы для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_user_id ON public.counterparties(user_id);

-- Индекс для быстрого поиска по дате создания транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ============================================
-- Готово! БД полностью инициализирована
-- ============================================

