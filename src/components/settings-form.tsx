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
import { updateDefaultExchangeRate } from '@/app/settings/actions';
import { toast } from 'sonner';
import { useState } from 'react';

// Схема валидации для формы настроек
const settingsSchema = z.object({
  default_exchange_rate: z.coerce.number().positive('Курс должен быть положительным'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  defaultExchangeRate: number;
  primaryCurrency: string;
}

/**
 * Форма настроек пользователя
 */
export function SettingsForm({ defaultExchangeRate, primaryCurrency }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_exchange_rate: defaultExchangeRate,
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('default_exchange_rate', data.default_exchange_rate.toString());

    const result = await updateDefaultExchangeRate(formData);

    if (result.error) {
      toast.error('Ошибка', {
        description: result.error,
      });
      setIsSubmitting(false);
    } else {
      toast.success('Курс обмена обновлен');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Курс обмена по умолчанию</CardTitle>
          <CardDescription>
            Курс обмена RUB/USD (сколько рублей за доллар), используемый для конвертации сумм
            при создании транзакций для проектов в валюте, отличной от валюты счета.
            Курс сохраняется в момент создания транзакции, поэтому изменение этого значения
            не повлияет на уже созданные транзакции.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="default_exchange_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Курс RUB/USD</FormLabel>
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
                      Текущая основная валюта: {primaryCurrency === 'RUB' ? 'Рубли (RUB)' : 'Доллары (USD)'}
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
    </div>
  );
}

