'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для создания проекта
const createProjectSchema = z.object({
  title: z.string().min(1, 'Название проекта обязательно'),
  budget: z.coerce.number().positive().optional().nullable(),
  currency: z.enum(['USD', 'RUB']).optional().nullable(),
  exchange_rate: z.coerce.number().positive().optional().nullable(),
  counterparty_id: z.string().uuid().nullable().optional(),
});

// Схема валидации для обновления проекта
const updateProjectSchema = z.object({
  id: z.string().uuid('Некорректный ID проекта'),
  title: z.string().min(1, 'Название проекта обязательно'),
  budget: z.coerce.number().positive().optional().nullable(),
  currency: z.enum(['USD', 'RUB']).optional().nullable(),
  exchange_rate: z.coerce.number().positive().optional().nullable(),
  counterparty_id: z.string().uuid().nullable().optional(),
  is_completed: z.coerce.boolean().optional(),
});

/**
 * Создает новый проект
 */
export async function createProject(formData: FormData) {
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
    const counterpartyId = formData.get('counterparty_id') as string | null;
    const budgetValue = formData.get('budget') as string;
    const currencyValue = formData.get('currency') as string | null;
    const exchangeRateValue = formData.get('exchange_rate') as string;
    const rawData = {
      title: formData.get('title') as string,
      budget: budgetValue && budgetValue.trim() !== '' ? budgetValue : null,
      currency: currencyValue && currencyValue !== 'none' ? currencyValue : null,
      exchange_rate: exchangeRateValue && exchangeRateValue.trim() !== '' ? exchangeRateValue : null,
      counterparty_id: counterpartyId && counterpartyId !== 'none' ? counterpartyId : null,
    };

    const validatedData = createProjectSchema.parse(rawData);

    // Создаем проект
    // Если бюджет не указан, то и валюта должна быть null
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        budget: validatedData.budget || null,
        currency: validatedData.budget ? (validatedData.currency || 'RUB') : null,
        exchange_rate: validatedData.exchange_rate || null,
        counterparty_id: validatedData.counterparty_id || null,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/projects');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при создании проекта' };
  }
}

/**
 * Обновляет существующий проект
 */
export async function updateProject(formData: FormData) {
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
    const counterpartyId = formData.get('counterparty_id') as string | null;
    const budgetValue = formData.get('budget') as string;
    const currencyValue = formData.get('currency') as string | null;
    const exchangeRateValue = formData.get('exchange_rate') as string;
    const isCompletedValue = formData.get('is_completed') as string | null;
    const rawData = {
      id: formData.get('id') as string,
      title: formData.get('title') as string,
      budget: budgetValue && budgetValue.trim() !== '' ? budgetValue : null,
      currency: currencyValue && currencyValue !== 'none' ? currencyValue : null,
      exchange_rate: exchangeRateValue && exchangeRateValue.trim() !== '' ? exchangeRateValue : null,
      counterparty_id: counterpartyId && counterpartyId !== 'none' ? counterpartyId : null,
      is_completed: isCompletedValue === 'true' || isCompletedValue === 'on',
    };

    const validatedData = updateProjectSchema.parse(rawData);

    // Обновляем проект
    // Если бюджет не указан, то и валюта должна быть null
    const { data, error } = await supabase
      .from('projects')
      .update({
        title: validatedData.title,
        budget: validatedData.budget || null,
        currency: validatedData.budget ? (validatedData.currency || 'RUB') : null,
        exchange_rate: validatedData.exchange_rate || null,
        counterparty_id: validatedData.counterparty_id || null,
        is_completed: validatedData.is_completed ?? false,
      })
      .eq('id', validatedData.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${validatedData.id}`);
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении проекта' };
  }
}

/**
 * Удаляет проект
 */
export async function deleteProject(projectId: string) {
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
    const validatedId = z.string().uuid().parse(projectId);

    // Удаляем проект
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', validatedId)
      .eq('user_id', user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${validatedId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при удалении проекта' };
  }
}

/**
 * Получает список проектов пользователя
 */
export async function getProjects() {
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

    // Получаем только активные проекты (is_completed = false) с информацией о контрагенте
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        counterparties:counterparty_id (
          id,
          name,
          type
        )
      `
      )
      .eq('is_completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    return { error: 'Ошибка при загрузке проектов', data: null };
  }
}

/**
 * Получает проект по ID
 */
export async function getProject(projectId: string) {
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
    const validatedId = z.string().uuid().parse(projectId);

    // Получаем проект с информацией о контрагенте
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        counterparties:counterparty_id (
          id,
          name,
          type
        )
      `
      )
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
    return { error: 'Ошибка при загрузке проекта', data: null };
  }
}

/**
 * Получает список контрагентов для формы проекта
 */
export async function getCounterparties() {
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

    // Получаем контрагентов
    const { data, error } = await supabase
      .from('counterparties')
      .select('id, name, type')
      .order('name');

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    return { error: 'Ошибка при загрузке контрагентов', data: null };
  }
}

/**
 * Переключает статус завершения проекта
 */
export async function toggleProjectCompletion(projectId: string, isCompleted: boolean) {
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
    const validatedId = z.string().uuid().parse(projectId);

    // Обновляем статус завершения проекта
    const { data, error } = await supabase
      .from('projects')
      .update({ is_completed: isCompleted })
      .eq('id', validatedId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${validatedId}`);
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении статуса проекта' };
  }
}

/**
 * Получает список завершенных проектов
 */
export async function getCompletedProjects() {
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

    // Получаем завершенные проекты (is_completed = true) с информацией о контрагенте
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        counterparties:counterparty_id (
          id,
          name,
          type
        )
      `
      )
      .eq('is_completed', true)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    return { error: 'Ошибка при загрузке завершенных проектов', data: null };
  }
}

/**
 * Получает транзакции проекта
 */
export async function getProjectTransactions(projectId: string) {
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
    const validatedId = z.string().uuid().parse(projectId);

    // Получаем транзакции проекта с полной информацией
    const { data, error } = await supabase
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
        counterparties:counterparty_id (
          id,
          name
        )
      `
      )
      .eq('project_id', validatedId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message, data: null };
    }

    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message, data: null };
    }
    return { error: 'Ошибка при загрузке транзакций проекта', data: null };
  }
}

