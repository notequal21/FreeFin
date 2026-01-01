# Финансовое приложение для фрилансеров: Схема БД (Supabase)

## Основные сущности

### profiles (Профили пользователей)

- `id`: uuid (references auth.users) — Первичный ключ.
- `full_name`: text — Имя пользователя.
- `primary_currency`: text (USD/RUB) — Основная валюта отображения.
- `is_approved`: boolean (default: false) — Флаг доступа. Если false, доступ к данным через RLS закрыт.

### accounts (Счета/Кошельки)

- `id`: uuid — Первичный ключ.
- `user_id`: uuid — Владелец.
- `name`: text — Название (напр. "Тинькофф", "Payoneer").
- `currency`: text (USD/RUB) — Валюта счета.
- `balance`: decimal — Текущий остаток.

### categories (Категории)

- `id`: uuid — Первичный ключ.
- `user_id`: uuid — Приватная категория (NULL, если общая).
- `name`: text — Название категории.
- `type`: text (income/expense) — Тип.

### transactions (Транзакции)

- `id`: uuid — Первичный ключ.
- `user_id`: uuid — Владелец.
- `account_id`: uuid — Ссылка на счет.
- `category_id`: uuid — Ссылка на категорию (NULL, если категория не указана).
- `project_id`: uuid — Ссылка на проект (NULL, если проект не указан).
- `counterparty_id`: uuid — Ссылка на контрагента (NULL, если контрагент не указан).
- `amount`: decimal — Сумма в валюте счета.
- `exchange_rate`: decimal — Курс обмена к `primary_currency` на момент транзакции (по умолчанию 1).
- `converted_amount`: decimal — Сумма в основной валюте (вычисляется триггером `amount * exchange_rate`).
- `type`: text (income/expense/withdrawal) — Тип операции.
- `tags`: text[] — Массив тегов (напр. ['проект_X', 'срочно']).
- `description`: text — Комментарий.
- `created_at`: timestamp — Дата и время создания транзакции.

## Важная бизнес-логика

1. **Безопасность (RLS)**: Все запросы проверяют `is_approved = true` в профиле пользователя.
2. **Конвертация**: Поле `converted_amount` никогда не заполняется фронтендом. Его вычисляет PostgreSQL триггер (`amount * exchange_rate`).
3. **Автоматизация**: Профиль создается автоматически при регистрации через Auth Trigger.

## Row Level Security (RLS) Политики

### profiles (Профили)

RLS включен для всех операций. Политики:

- **INSERT**: Пользователь может создавать свой собственный профиль (`auth.uid() = id`). Это необходимо для регистрации, когда `is_approved` еще `false`.
- **SELECT**: Пользователь может читать свой профиль (`auth.uid() = id`), даже если `is_approved = false`.
- **UPDATE**: Пользователь может обновлять свой профиль (`auth.uid() = id`).

### accounts, transactions, projects, counterparties

RLS включен для всех операций. Политики:

- **ALL (SELECT, INSERT, UPDATE, DELETE)**: Доступ разрешен только если:
  - Пользователь одобрен: `profiles.is_approved = true`
  - Пользователь является владельцем: `user_id = auth.uid()`

### categories (Категории)

RLS включен для всех операций. Политики:

- **SELECT**: Пользователь может видеть:
  - Общие категории (`user_id IS NULL`) — доступны всем одобренным пользователям
  - Приватные категории (`user_id = auth.uid()`) — только свои, если пользователь одобрен
- **INSERT, UPDATE, DELETE**: Пользователь может управлять только своими категориями (`user_id = auth.uid()`) и только если одобрен.

## Триггеры и Функции

### handle_new_user()

**Триггер**: `on_auth_user_created`  
**Событие**: `AFTER INSERT ON auth.users`  
**Функция**: `SECURITY DEFINER` (обходит RLS при создании профиля)

Автоматически создает профиль при регистрации нового пользователя. Функция выполняется с правами создателя функции, поэтому RLS политики не применяются к операции вставки.

**Параметры создаваемого профиля:**

- `id` = `auth.users.id`
- `full_name` = из `raw_user_meta_data` (если есть)
- `primary_currency` = из `raw_user_meta_data` или `'USD'` по умолчанию
- `is_approved` = `false` (явно устанавливается при создании)

**Важно:** Использует `ON CONFLICT DO NOTHING` для предотвращения ошибок при повторных попытках создания. Если триггер не сработал, приложение создает профиль вручную через клиентский код с проверкой RLS политики.

### calculate_converted_amount()

**Триггер**: `calculate_converted_amount`  
**Событие**: `BEFORE INSERT OR UPDATE OF amount, exchange_rate ON transactions`

Автоматически вычисляет `converted_amount` при создании или обновлении транзакции:

- `converted_amount` = `amount * exchange_rate`
- Если `exchange_rate` не указан, используется значение `1`

**Важно**: Поле `converted_amount` никогда не должно заполняться вручную на фронтенде. Его вычисляет только этот триггер.
