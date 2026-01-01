import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'

/**
 * Проверяет, залогинен ли пользователь
 * Если пользователь не залогинен, перенаправляет на страницу авторизации
 * 
 * @returns Объект с данными пользователя, сессией и профилем
 * @throws Перенаправляет на /auth, если пользователь не залогинен
 */
export async function requireAuth() {
  const supabase = await createClient()
  
  // Получаем текущую сессию пользователя
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  // Если нет сессии или произошла ошибка, перенаправляем на страницу авторизации
  if (!session || error) {
    redirect('/auth')
  }

  // Получаем профиль пользователя для проверки is_approved
  // Используем maybeSingle() вместо single() для безопасной обработки случаев,
  // когда профиль может отсутствовать или быть дублирован
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, is_approved, primary_currency')
    .eq('id', session.user.id)
    .maybeSingle()

  // Обрабатываем ошибки запроса (например, дубликаты профилей)
  if (profileError) {
    console.error('Ошибка получения профиля:', profileError)
    // Если ошибка связана с множественными результатами, это проблема с дубликатами
    // В этом случае нужно исправить базу данных через SQL-скрипт
  }

  // Если профиль не найден, создаем его (на случай, если триггер не сработал)
  if (!profile && !profileError) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: session.user.id,
        is_approved: false,
      })

    if (insertError) {
      console.error('Ошибка создания профиля:', insertError)
    }
  }

  return {
    user: session.user,
    session,
    profile: profile || null,
  }
}

/**
 * Проверяет, залогинен ли пользователь (без редиректа)
 * 
 * @returns Объект с данными пользователя, сессией и профилем, или null если не залогинен
 */
export async function getAuth() {
  const supabase = await createClient()
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  // Получаем профиль пользователя
  // Используем maybeSingle() вместо single() для безопасной обработки
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, is_approved, primary_currency')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    user: session.user,
    session,
    profile: profile || null,
  }
}

