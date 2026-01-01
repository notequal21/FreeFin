'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для создания счета
const createAccountSchema = z.object({
  name: z.string().min(1, 'Название счета обязательно'),
  balance: z.coerce.number().default(0),
  currency: z.enum(['USD', 'RUB'], {
    errorMap: () => ({ message: 'Валюта должна быть USD или RUB' }),
  }),
});

// Схема валидации для обновления счета
const updateAccountSchema = z.object({
  id: z.string().uuid('Некорректный ID счета'),
  name: z.string().min(1, 'Название счета обязательно'),
  balance: z.coerce.number().default(0),
  currency: z.enum(['USD', 'RUB'], {
    errorMap: () => ({ message: 'Валюта должна быть USD или RUB' }),
  }),
});

/**
 * Создает новый счет
 */
export async function createAccount(formData: FormData) {
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
      name: formData.get('name') as string,
      balance: formData.get('balance') as string,
      currency: formData.get('currency') as 'USD' | 'RUB',
    };

    const validatedData = createAccountSchema.parse(rawData);

    // Создаем счет
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        balance: validatedData.balance,
        currency: validatedData.currency,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/accounts');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: 'Ошибка при создании счета' };
  }
}

/**
 * Обновляет существующий счет
 */
export async function updateAccount(formData: FormData) {
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
      name: formData.get('name') as string,
      balance: formData.get('balance') as string,
      currency: formData.get('currency') as 'USD' | 'RUB',
    };

    const validatedData = updateAccountSchema.parse(rawData);

    // Обновляем счет
    const { data, error } = await supabase
      .from('accounts')
      .update({
        name: validatedData.name,
        balance: validatedData.balance,
        currency: validatedData.currency,
      })
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/accounts');
    revalidatePath(`/accounts/${validatedData.id}`);
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: 'Ошибка при обновлении счета' };
  }
}

/**
 * Удаляет счет
 */
export async function deleteAccount(accountId: string) {
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
    const validatedId = z.string().uuid().parse(accountId);

    // Удаляем счет
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/accounts');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: 'Ошибка при удалении счета' };
  }
}

