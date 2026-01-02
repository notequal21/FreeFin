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
    };

    const validatedData = createTransactionSchema.parse(rawData);

    // Создаем транзакцию
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
        type: validatedData.type,
        tags: validatedData.tags || [],
        description: validatedData.description || null,
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
    };

    const validatedData = updateTransactionSchema.parse(rawData);

    // Получаем старый account_id перед обновлением (для инвалидации кэша старого счета)
    const { data: oldTransaction } = await supabase
      .from('transactions')
      .select('account_id')
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .single();

    // Обновляем транзакцию
    const { data, error } = await supabase
      .from('transactions')
      .update({
        account_id: validatedData.account_id,
        category_id: validatedData.category_id || null,
        project_id: validatedData.project_id || null,
        counterparty_id: validatedData.counterparty_id || null,
        amount: validatedData.amount,
        exchange_rate: validatedData.exchange_rate,
        type: validatedData.type,
        tags: validatedData.tags || [],
        description: validatedData.description || null,
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

    // Получаем все необходимые данные параллельно
    const [
      accountsResult,
      categoriesResult,
      projectsResult,
      counterpartiesResult,
    ] = await Promise.all([
      supabase.from('accounts').select('id, name, currency').order('name'),
      supabase.from('categories').select('id, name, type').order('name'),
      supabase.from('projects').select('id, title').order('title'),
      supabase.from('counterparties').select('id, name').order('name'),
    ]);

    return {
      data: {
        accounts: accountsResult.data || [],
        categories: categoriesResult.data || [],
        projects: projectsResult.data || [],
        counterparties: counterpartiesResult.data || [],
      },
      success: true,
    };
  } catch (error) {
    return { error: 'Ошибка при загрузке данных', data: null };
  }
}
