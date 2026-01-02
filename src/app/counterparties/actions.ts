'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для создания контрагента
const createCounterpartySchema = z.object({
  name: z.string().min(1, 'Название контрагента обязательно'),
  type: z.enum(['client', 'contractor'], {
    errorMap: () => ({ message: 'Тип должен быть client или contractor' }),
  }),
});

// Схема валидации для обновления контрагента
const updateCounterpartySchema = z.object({
  id: z.string().uuid('Некорректный ID контрагента'),
  name: z.string().min(1, 'Название контрагента обязательно'),
  type: z.enum(['client', 'contractor'], {
    errorMap: () => ({ message: 'Тип должен быть client или contractor' }),
  }),
});

/**
 * Создает нового контрагента
 */
export async function createCounterparty(formData: FormData) {
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
      type: formData.get('type') as 'client' | 'contractor',
    };

    const validatedData = createCounterpartySchema.parse(rawData);

    // Создаем контрагента
    const { data, error } = await supabase
      .from('counterparties')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        type: validatedData.type,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/counterparties');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при создании контрагента' };
  }
}

/**
 * Обновляет существующего контрагента
 */
export async function updateCounterparty(formData: FormData) {
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
      type: formData.get('type') as 'client' | 'contractor',
    };

    const validatedData = updateCounterpartySchema.parse(rawData);

    // Обновляем контрагента
    const { data, error } = await supabase
      .from('counterparties')
      .update({
        name: validatedData.name,
        type: validatedData.type,
      })
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/counterparties');
    revalidatePath(`/counterparties/${validatedData.id}`);
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении контрагента' };
  }
}

/**
 * Удаляет контрагента
 */
export async function deleteCounterparty(counterpartyId: string) {
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
    const validatedId = z.string().uuid().parse(counterpartyId);

    // Удаляем контрагента
    const { error } = await supabase
      .from('counterparties')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/counterparties');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при удалении контрагента' };
  }
}

/**
 * Получает список контрагентов пользователя
 * @param type - Фильтр по типу контрагента (client/contractor) или null для всех
 */
export async function getCounterparties(type?: 'client' | 'contractor' | null) {
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

    // Строим запрос с фильтром по типу, если указан
    let query = supabase
      .from('counterparties')
      .select('id, name, type, created_at')
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    return { error: 'Ошибка при загрузке контрагентов', data: null };
  }
}

/**
 * Получает контрагента по ID
 */
export async function getCounterparty(counterpartyId: string) {
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

    // Валидируем ID
    const validatedId = z.string().uuid().parse(counterpartyId);

    // Получаем контрагента
    const { data, error } = await supabase
      .from('counterparties')
      .select('id, name, type, created_at')
      .eq('id', validatedId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message, data: null };
    }
    return { error: 'Ошибка при загрузке контрагента', data: null };
  }
}

