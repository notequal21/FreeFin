'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для создания транзакции
const createTransactionSchema = z.object({
  account_id: z.string().uuid('Некорректный ID счета'),
  category_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive('Сумма должна быть положительной'),
  exchange_rate: z.coerce.number().positive().default(1),
  type: z.enum(['income', 'expense', 'withdrawal'], {
    message: 'Тип должен быть income, expense или withdrawal',
  }),
  tags: z.array(z.string()).optional().default([]),
  description: z.string().nullable().optional(),
  is_scheduled: z.preprocess((val) => {
    if (typeof val === 'string') {
      return val === 'true';
    }
    return val === true;
  }, z.boolean().default(false)),
  scheduled_date: z.string().nullable().optional(),
  transaction_date: z.string().nullable().optional(), // Дата транзакции (по умолчанию текущая дата)
});

// Схема валидации для обновления транзакции
const updateTransactionSchema = createTransactionSchema.extend({
  id: z.string().uuid('Некорректный ID транзакции'),
});

/**
 * Создает новую транзакцию
 */
export async function createTransaction(formData: FormData) {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация' };
    }

    // Валидируем данные
    const rawData = {
      account_id: formData.get('account_id') as string,
      category_id: formData.get('category_id') as string | null,
      project_id: formData.get('project_id') as string | null,
      counterparty_id: formData.get('counterparty_id') as string | null,
      amount: formData.get('amount') as string,
      exchange_rate: (formData.get('exchange_rate') as string) || '1',
      type: formData.get('type') as 'income' | 'expense' | 'withdrawal',
      tags: formData.get('tags')
        ? JSON.parse(formData.get('tags') as string)
        : [],
      description: formData.get('description') as string | null,
      is_scheduled: formData.get('is_scheduled') as string | undefined,
      scheduled_date: formData.get('scheduled_date') as string | null,
      transaction_date: formData.get('transaction_date') as string | null,
    };

    const validatedData = createTransactionSchema.parse(rawData);

    // Если транзакция создается для проекта, вычисляем и сохраняем курс к валюте проекта
    let projectExchangeRate: number | null = null;

    if (validatedData.project_id) {
      // Получаем валюту проекта, валюту счета и профиль пользователя
      const [projectResult, accountResult, profileResult] = await Promise.all([
        supabase
          .from('projects')
          .select('currency, exchange_rate')
          .eq('id', validatedData.project_id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('accounts')
          .select('currency')
          .eq('id', validatedData.account_id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('primary_currency, default_exchange_rate')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      const projectCurrency = projectResult.data?.currency;
      const projectExchangeRateFromProject = projectResult.data?.exchange_rate;
      const accountCurrency = accountResult.data?.currency || 'RUB';
      const primaryCurrency = profileResult.data?.primary_currency || 'RUB';
      const defaultExchangeRate =
        profileResult.data?.default_exchange_rate || 100;

      // Используем курс проекта, если он указан, иначе курс по умолчанию из профиля
      const exchangeRateToUse =
        projectExchangeRateFromProject || defaultExchangeRate;

      // Определяем валюту транзакции
      // Если exchange_rate !== 1, то транзакция в валюте, отличной от валюты счета
      const isTransactionInDifferentCurrency =
        validatedData.exchange_rate !== 1;
      const transactionCurrency = isTransactionInDifferentCurrency
        ? accountCurrency === 'RUB'
          ? 'USD'
          : 'RUB'
        : accountCurrency;

      // project_exchange_rate нужен только если:
      // 1. Валюта проекта указана
      // 2. Валюта проекта отличается от валюты транзакции
      // 3. Валюта проекта отличается от валюты счета
      // 4. Валюта проекта отличается от primary_currency
      // (иначе конвертация не нужна или уже выполнена через exchange_rate)
      if (
        projectCurrency &&
        projectCurrency !== transactionCurrency &&
        projectCurrency !== accountCurrency &&
        projectCurrency !== primaryCurrency
      ) {
        // Используем курс проекта (если указан) или курс по умолчанию для конвертации из primary_currency в валюту проекта
        // project_exchange_rate - это курс от primary_currency к валюте проекта
        if (primaryCurrency === 'RUB' && projectCurrency === 'USD') {
          // Конвертация RUB -> USD: курс = 1 / exchange_rate (сколько долларов за рубль)
          projectExchangeRate = 1 / exchangeRateToUse;
        } else if (primaryCurrency === 'USD' && projectCurrency === 'RUB') {
          // Конвертация USD -> RUB: курс = exchange_rate (сколько рублей за доллар)
          projectExchangeRate = exchangeRateToUse;
        }
      }
    }

    // Создаем транзакцию
    // Примечание:
    // - exchange_rate используется для конвертации в primary_currency
    // - project_exchange_rate сохраняет курс к валюте проекта на момент создания транзакции
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        project_id: validatedData.project_id || null,
        counterparty_id: validatedData.counterparty_id || null,
        amount: validatedData.amount,
        exchange_rate: validatedData.exchange_rate,
        project_exchange_rate: projectExchangeRate,
        type: validatedData.type,
        tags: validatedData.tags || [],
        description: validatedData.description || null,
        is_scheduled: validatedData.is_scheduled || false,
        scheduled_date: validatedData.scheduled_date || null,
        transaction_date: validatedData.transaction_date || new Date().toISOString().split('T')[0], // По умолчанию текущая дата
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Инвалидируем кэш страниц транзакций и счетов
    // Баланс счета обновляется триггером, поэтому нужно обновить страницы счетов
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    if (data?.account_id) {
      revalidatePath(`/accounts/${data.account_id}`);
    }
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при создании транзакции' };
  }
}

/**
 * Обновляет существующую транзакцию
 */
export async function updateTransaction(formData: FormData) {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация' };
    }

    // Валидируем данные
    const rawData = {
      id: formData.get('id') as string,
      account_id: formData.get('account_id') as string,
      category_id: formData.get('category_id') as string | null,
      project_id: formData.get('project_id') as string | null,
      counterparty_id: formData.get('counterparty_id') as string | null,
      amount: formData.get('amount') as string,
      exchange_rate: (formData.get('exchange_rate') as string) || '1',
      type: formData.get('type') as 'income' | 'expense' | 'withdrawal',
      tags: formData.get('tags')
        ? JSON.parse(formData.get('tags') as string)
        : [],
      description: formData.get('description') as string | null,
      is_scheduled: formData.get('is_scheduled') as string | undefined,
      scheduled_date: formData.get('scheduled_date') as string | null,
      transaction_date: formData.get('transaction_date') as string | null,
    };

    const validatedData = updateTransactionSchema.parse(rawData);

    // Получаем старую транзакцию перед обновлением (для инвалидации кэша старого счета и проверки is_scheduled)
    const { data: oldTransaction } = await supabase
      .from('transactions')
      .select('account_id, is_scheduled, transaction_date')
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .single();

    // Если транзакция обновляется для проекта, вычисляем и сохраняем курс к валюте проекта
    let projectExchangeRate: number | null = null;

    if (validatedData.project_id) {
      // Получаем валюту проекта, валюту счета и профиль пользователя
      const [projectResult, accountResult, profileResult] = await Promise.all([
        supabase
          .from('projects')
          .select('currency, exchange_rate')
          .eq('id', validatedData.project_id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('accounts')
          .select('currency')
          .eq('id', validatedData.account_id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('primary_currency, default_exchange_rate')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      const projectCurrency = projectResult.data?.currency;
      const projectExchangeRateFromProject = projectResult.data?.exchange_rate;
      const accountCurrency = accountResult.data?.currency || 'RUB';
      const primaryCurrency = profileResult.data?.primary_currency || 'RUB';
      const defaultExchangeRate =
        profileResult.data?.default_exchange_rate || 100;

      // Используем курс проекта, если он указан, иначе курс по умолчанию из профиля
      const exchangeRateToUse =
        projectExchangeRateFromProject || defaultExchangeRate;

      // Определяем валюту транзакции
      // Если exchange_rate !== 1, то транзакция в валюте, отличной от валюты счета
      const isTransactionInDifferentCurrency =
        validatedData.exchange_rate !== 1;
      const transactionCurrency = isTransactionInDifferentCurrency
        ? accountCurrency === 'RUB'
          ? 'USD'
          : 'RUB'
        : accountCurrency;

      // project_exchange_rate нужен только если:
      // 1. Валюта проекта указана
      // 2. Валюта проекта отличается от валюты транзакции
      // 3. Валюта проекта отличается от валюты счета
      // 4. Валюта проекта отличается от primary_currency
      // (иначе конвертация не нужна или уже выполнена через exchange_rate)
      if (
        projectCurrency &&
        projectCurrency !== transactionCurrency &&
        projectCurrency !== accountCurrency &&
        projectCurrency !== primaryCurrency
      ) {
        // Используем курс проекта (если указан) или курс по умолчанию для конвертации из primary_currency в валюту проекта
        if (primaryCurrency === 'RUB' && projectCurrency === 'USD') {
          // Конвертация RUB -> USD: курс = 1 / exchange_rate (сколько долларов за рубль)
          projectExchangeRate = 1 / exchangeRateToUse;
        } else if (primaryCurrency === 'USD' && projectCurrency === 'RUB') {
          // Конвертация USD -> RUB: курс = exchange_rate (сколько рублей за доллар)
          projectExchangeRate = exchangeRateToUse;
        }
      }
    }

    // Определяем transaction_date:
    // 1. Если пользователь указал дату, используем её
    // 2. Если is_scheduled меняется с true на false (подтверждение запланированной транзакции)
    //    и transaction_date не установлена, устанавливаем текущую дату
    // 3. Иначе оставляем существующее значение или устанавливаем текущую дату
    let transactionDate: string | null = validatedData.transaction_date || null;
    
    if (
      oldTransaction &&
      oldTransaction.is_scheduled === true &&
      validatedData.is_scheduled === false &&
      !transactionDate &&
      !oldTransaction.transaction_date
    ) {
      // Подтверждение запланированной транзакции: устанавливаем текущую дату
      transactionDate = new Date().toISOString().split('T')[0];
    } else if (!transactionDate && oldTransaction?.transaction_date) {
      // Сохраняем существующую дату, если новая не указана
      transactionDate = oldTransaction.transaction_date;
    } else if (!transactionDate) {
      // Если дата не указана и не была установлена ранее, используем текущую дату
      transactionDate = new Date().toISOString().split('T')[0];
    }

    // Обновляем транзакцию
    // Примечание:
    // - exchange_rate используется для конвертации в primary_currency
    // - project_exchange_rate сохраняет курс к валюте проекта на момент обновления транзакции
    const { data, error } = await supabase
      .from('transactions')
      .update({
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        project_id: validatedData.project_id || null,
        counterparty_id: validatedData.counterparty_id || null,
        amount: validatedData.amount,
        exchange_rate: validatedData.exchange_rate,
        project_exchange_rate: projectExchangeRate,
        type: validatedData.type,
        tags: validatedData.tags || [],
        description: validatedData.description || null,
        is_scheduled: validatedData.is_scheduled || false,
        scheduled_date: validatedData.scheduled_date || null,
        transaction_date: transactionDate,
      })
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Инвалидируем кэш страниц транзакций и счетов
    // Баланс счета обновляется триггером, поэтому нужно обновить страницы счетов
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    if (data?.account_id) {
      revalidatePath(`/accounts/${data.account_id}`);
    }
    // Также нужно обновить старый счет, если account_id изменился
    if (
      oldTransaction?.account_id &&
      oldTransaction.account_id !== data?.account_id
    ) {
      revalidatePath(`/accounts/${oldTransaction.account_id}`);
    }
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении транзакции' };
  }
}

/**
 * Удаляет транзакцию
 */
export async function deleteTransaction(transactionId: string) {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация' };
    }

    // Валидируем ID
    const validatedId = z.string().uuid().parse(transactionId);

    // Получаем account_id перед удалением (для инвалидации кэша счета)
    const { data: transaction } = await supabase
      .from('transactions')
      .select('account_id')
      .eq('id', validatedId)
      .eq('user_id', user.id)
      .single();

    // Удаляем транзакцию
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    // Инвалидируем кэш страниц транзакций и счетов
    // Баланс счета обновляется триггером, поэтому нужно обновить страницы счетов
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    if (transaction?.account_id) {
      revalidatePath(`/accounts/${transaction.account_id}`);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при удалении транзакции' };
  }
}

/**
 * Получает список транзакций с фильтрацией по типу
 */
export async function getTransactions(
  type?: 'income' | 'expense' | 'withdrawal'
) {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация', data: null };
    }

    // Строим запрос
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        accounts:account_id (
          id,
          name,
          currency
        ),
        categories:category_id (
          id,
          name
        ),
        projects:project_id (
          id,
          title
        ),
        counterparties:counterparty_id (
          id,
          name
        )
      `
      )
      .order('created_at', { ascending: false });

    // Применяем фильтр по типу, если указан
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    return { error: 'Ошибка при загрузке транзакций', data: null };
  }
}

/**
 * Подтверждает запланированную транзакцию (меняет is_scheduled на false)
 */
export async function confirmScheduledTransaction(transactionId: string) {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация' };
    }

    // Валидируем ID
    const validatedId = z.string().uuid().parse(transactionId);

    // Проверяем, что транзакция существует и является запланированной
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('id, is_scheduled, account_id, transaction_date')
      .eq('id', validatedId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !transaction) {
      return { error: 'Транзакция не найдена' };
    }

    if (!transaction.is_scheduled) {
      return { error: 'Транзакция не является запланированной' };
    }

    // Определяем transaction_date: если не установлена, устанавливаем текущую дату
    const transactionDate = transaction.transaction_date || new Date().toISOString().split('T')[0];

    // Обновляем транзакцию: убираем флаг is_scheduled и устанавливаем transaction_date
    const { data, error } = await supabase
      .from('transactions')
      .update({ 
        is_scheduled: false,
        transaction_date: transactionDate, // Автоматически устанавливаем текущую дату при подтверждении
      })
      .eq('id', validatedId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Инвалидируем кэш страниц транзакций и счетов
    // Баланс счета обновляется триггером, поэтому нужно обновить страницы счетов
    revalidatePath('/transactions');
    revalidatePath('/accounts');
    if (transaction.account_id) {
      revalidatePath(`/accounts/${transaction.account_id}`);
    }

    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при подтверждении транзакции' };
  }
}

/**
 * Получает данные для выпадающих списков формы транзакции
 */
export async function getTransactionFormData() {
  try {
    const supabase = await createClient();

    // Проверяем аутентификацию
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Необходима аутентификация', data: null };
    }

    // Получаем все необходимые данные параллельно, включая профиль для курса по умолчанию
    const [
      accountsResult,
      categoriesResult,
      projectsResult,
      counterpartiesResult,
      profileResult,
    ] = await Promise.all([
      supabase.from('accounts').select('id, name, currency').order('name'),
      supabase.from('categories').select('id, name, type').order('name'),
      supabase.from('projects').select('id, title').order('title'),
      supabase.from('counterparties').select('id, name').order('name'),
      supabase
        .from('profiles')
        .select('default_exchange_rate, primary_currency')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    return {
      data: {
        accounts: accountsResult.data || [],
        categories: categoriesResult.data || [],
        projects: projectsResult.data || [],
        counterparties: counterpartiesResult.data || [],
        defaultExchangeRate: profileResult.data?.default_exchange_rate || 100,
        primaryCurrency: profileResult.data?.primary_currency || 'RUB',
      },
      success: true,
    };
  } catch (error) {
    return { error: 'Ошибка при загрузке данных', data: null };
  }
}
