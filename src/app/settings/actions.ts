'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// Схема валидации для обновления профиля
const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Имя не может быть пустым')
    .max(255, 'Имя слишком длинное'),
  primary_currency: z.enum(['USD', 'RUB'], {
    message: 'Выберите валюту: USD или RUB',
  }),
  default_exchange_rate: z.coerce
    .number()
    .positive('Курс должен быть положительным'),
});

/**
 * Обновляет профиль пользователя (имя, валюту по умолчанию и курс обмена)
 */
export async function updateProfile(formData: FormData) {
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
      full_name: formData.get('full_name') as string,
      primary_currency: formData.get('primary_currency') as string,
      default_exchange_rate: formData.get('default_exchange_rate') as string,
    };

    const validatedData = updateProfileSchema.parse(rawData);

    // Обновляем профиль
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: validatedData.full_name,
        primary_currency: validatedData.primary_currency,
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
    return { error: 'Ошибка при обновлении профиля' };
  }
}
