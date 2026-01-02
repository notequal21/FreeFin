'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProfile } from '@/app/settings/actions';
import { PasswordChangeForm } from '@/components/password-change-form';
import { EmailChangeForm } from '@/components/email-change-form';
import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tag01Icon } from '@hugeicons/core-free-icons';

// Схема валидации для формы настроек
const settingsSchema = z.object({
  full_name: z.string().min(1, 'Имя не может быть пустым').max(255, 'Имя слишком длинное'),
  primary_currency: z.enum(['USD', 'RUB'], {
    message: 'Выберите валюту: USD или RUB',
  }),
  default_exchange_rate: z.coerce.number().positive('Курс должен быть положительным'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  fullName: string | null;
  defaultExchangeRate: number;
  primaryCurrency: string;
}

/**
 * Форма настроек пользователя
 */
export function SettingsForm({ fullName, defaultExchangeRate, primaryCurrency }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      full_name: fullName || '',
      primary_currency: primaryCurrency as 'USD' | 'RUB',
      default_exchange_rate: defaultExchangeRate,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('full_name', data.full_name);
    formData.append('primary_currency', data.primary_currency);
    formData.append('default_exchange_rate', data.default_exchange_rate.toString());

    const result = await updateProfile(formData);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsSubmitting(false);
    } else {
      toast.success('Настройки сохранены');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Карточка с настройками профиля */}
      <Card>
        <CardHeader>
          <CardTitle>Настройки профиля</CardTitle>
          <CardDescription>
            Управление именем, валютой по умолчанию и курсом обмена
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Поле для редактирования имени */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Введите ваше имя"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ваше имя будет отображаться в профиле
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Поле для выбора валюты по умолчанию */}
              <FormField
                control={form.control}
                name="primary_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Валюта по умолчанию</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите валюту" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RUB">Рубли (RUB)</SelectItem>
                        <SelectItem value="USD">Доллары (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Основная валюта для отображения сумм в приложении
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Поле для курса обмена */}
              <FormField
                control={form.control}
                name="default_exchange_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Курс обмена RUB/USD</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? '' : parseFloat(value));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Курс обмена RUB/USD (сколько рублей за доллар), используемый для конвертации сумм
                      при создании транзакций для проектов в валюте, отличной от валюты счета.
                      Курс сохраняется в момент создания транзакции, поэтому изменение этого значения
                      не повлияет на уже созданные транзакции.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Карточка для смены пароля */}
      <Card>
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>
            Измените пароль для вашего аккаунта. Требуется подтверждение текущего пароля.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      {/* Карточка для смены email */}
      <Card>
        <CardHeader>
          <CardTitle>Смена email</CardTitle>
          <CardDescription>
            Измените email адрес вашего аккаунта. Требуется подтверждение пароля и подтверждение через оба email адреса.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailChangeForm />
        </CardContent>
      </Card>

      {/* Карточка для управления категориями */}
      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
          <CardDescription>
            Управление категориями для доходов и расходов. Создавайте, редактируйте и удаляйте свои категории.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/categories">
            <Button variant="outline" className="w-full">
              <HugeiconsIcon icon={Tag01Icon} size={20} className="mr-2" />
              Управление категориями
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

