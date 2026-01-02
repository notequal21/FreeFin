import { requireAuth, getAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";

/**
 * Страница настроек
 * Проверка is_approved выполняется на уровне layout
 */
export default async function SettingsPage() {
  await requireAuth();

  const supabase = await createClient();
  const auth = await getAuth();

  // Получаем профиль пользователя
  let profile = null;
  if (auth?.user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, default_exchange_rate, primary_currency')
      .eq('id', auth.user.id)
      .maybeSingle();
    
    profile = data;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Настройки
      </h1>
      
      <SettingsForm 
        fullName={profile?.full_name || null}
        defaultExchangeRate={profile?.default_exchange_rate || 100}
        primaryCurrency={profile?.primary_currency || 'RUB'}
      />
    </div>
  );
}

