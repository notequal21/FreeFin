'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для создания категории
const createCategorySchema = z.object({
  name: z.string().min(1, 'Название категории обязательно'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Тип должен быть income или expense' }),
  }),
});

// Схема валидации для обновления категории
const updateCategorySchema = z.object({
  id: z.string().uuid('Некорректный ID категории'),
  name: z.string().min(1, 'Название категории обязательно'),
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Тип должен быть income или expense' }),
  }),
});

/**
 * Создает новую категорию (приватную, user_id = auth.uid())
 */
export async function createCategory(formData: FormData) {
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
      type: formData.get('type') as 'income' | 'expense',
    };

    const validatedData = createCategorySchema.parse(rawData);

    // Создаем категорию (приватную, с user_id)
    const { data, error } = await supabase
      .from('categories')
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

    revalidatePath('/settings/categories');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при создании категории' };
  }
}

/**
 * Обновляет существующую категорию (только приватную, user_id = auth.uid())
 */
export async function updateCategory(formData: FormData) {
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
      type: formData.get('type') as 'income' | 'expense',
    };

    const validatedData = updateCategorySchema.parse(rawData);

    // Обновляем категорию (только свою, приватную)
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: validatedData.name,
        type: validatedData.type,
      })
      .eq('id', validatedData.id)
      .eq('user_id', user.id) // Только свои категории
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/settings/categories');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении категории' };
  }
}

/**
 * Удаляет категорию (только приватную, user_id = auth.uid())
 */
export async function deleteCategory(categoryId: string) {
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
    const validatedId = z.string().uuid().parse(categoryId);

    // Удаляем категорию (только свою, приватную)
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', user.id); // Только свои категории

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/settings/categories');
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при удалении категории' };
  }
}

/**
 * Получает список категорий пользователя
 * Возвращает общие категории (user_id IS NULL) и приватные (user_id = auth.uid())
 * @param type - Фильтр по типу категории (income/expense) или null для всех
 */
export async function getCategories(type?: 'income' | 'expense' | null) {
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

    // Строим запрос: общие категории (user_id IS NULL) или приватные (user_id = auth.uid())
    let query = supabase
      .from('categories')
      .select('id, name, type, user_id, created_at')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
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
    return { error: 'Ошибка при загрузке категорий', data: null };
  }
}

