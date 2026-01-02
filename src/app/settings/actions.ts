'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для обновления профиля
const updateProfileSchema = z.object({
  default_exchange_rate: z.coerce.number().positive('Курс должен быть положительным'),
});

/**
 * Обновляет курс обмена по умолчанию в профиле пользователя
 */
export async function updateDefaultExchangeRate(formData: FormData) {
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
      default_exchange_rate: formData.get('default_exchange_rate') as string,
    };

    const validatedData = updateProfileSchema.parse(rawData);

    // Обновляем профиль
    const { data, error } = await supabase
      .from('profiles')
      .update({
        default_exchange_rate: validatedData.default_exchange_rate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/settings');
    return { data, success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: 'Ошибка при обновлении курса' };
  }
}

