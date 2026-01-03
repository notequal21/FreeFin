import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Создает серверный клиент Supabase для использования в Server Components и Server Actions
 * Использует cookies для получения сессии пользователя
 */
export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Проверяем наличие переменных окружения
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Отсутствуют переменные окружения Supabase. Убедитесь, что NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY установлены.'
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Ошибка может возникнуть при установке cookies в middleware
          // Игнорируем её, так как это нормальное поведение
        }
      },
    },
  })
}

