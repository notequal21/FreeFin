'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { TransactionFormDialog } from '@/components/transaction-form-dialog';
import { getTransactionFormData } from '@/app/transactions/actions';
import { useRouter } from 'next/navigation';

interface TransactionDialogContextType {
  openDialog: (options?: {
    defaultType?: 'income' | 'expense' | 'withdrawal';
    defaultAccountId?: string | null;
    defaultProjectId?: string | null;
    defaultCounterpartyId?: string | null;
  }) => void;
  closeDialog: () => void;
}

const TransactionDialogContext = createContext<
  TransactionDialogContextType | undefined
>(undefined);

interface TransactionDialogProviderProps {
  children: ReactNode;
}

/**
 * Провайдер для глобального управления модалкой создания транзакции
 */
export function TransactionDialogProvider({
  children,
}: TransactionDialogProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<
    'income' | 'expense' | 'withdrawal' | undefined
  >();
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState<{
    accounts: Array<{ id: string; name: string; currency: string }>;
    categories: Array<{ id: string; name: string; type: string }>;
    projects: Array<{ id: string; title: string }>;
    counterparties: Array<{ id: string; name: string }>;
    defaultExchangeRate?: number;
    primaryCurrency?: string;
  } | null>(null);

  // Загружаем данные для формы при первом открытии
  const loadFormData = async () => {
    if (!formData) {
      const result = await getTransactionFormData();
      if (result.data) {
        setFormData(result.data);
      }
    }
  };

  const openDialog = async (options?: {
    defaultType?: 'income' | 'expense' | 'withdrawal';
    defaultAccountId?: string | null;
    defaultProjectId?: string | null;
    defaultCounterpartyId?: string | null;
  }) => {
    // Загружаем данные для формы
    await loadFormData();

    // Устанавливаем параметры по умолчанию
    setDefaultType(options?.defaultType);
    setDefaultAccountId(options?.defaultAccountId || null);
    setDefaultProjectId(options?.defaultProjectId || null);
    setDefaultCounterpartyId(options?.defaultCounterpartyId || null);

    // Открываем модалку
    setIsOpen(true);
  };

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    // Сбрасываем параметры после закрытия
    setDefaultType(undefined);
    setDefaultAccountId(null);
    setDefaultProjectId(null);
    setDefaultCounterpartyId(null);
    // Обновляем страницу после закрытия модалки (для обновления данных)
    router.refresh();
  }, [router]);

  return (
    <TransactionDialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      {/* Глобальная модалка создания транзакции */}
      {formData && (
        <TransactionFormDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            }
          }}
          defaultType={defaultType}
          defaultAccountId={defaultAccountId}
          defaultProjectId={defaultProjectId}
          defaultCounterpartyId={defaultCounterpartyId}
          formData={formData}
        />
      )}
    </TransactionDialogContext.Provider>
  );
}

/**
 * Хук для использования контекста модалки транзакций
 */
export function useTransactionDialog() {
  const context = useContext(TransactionDialogContext);
  if (context === undefined) {
    throw new Error(
      'useTransactionDialog must be used within a TransactionDialogProvider'
    );
  }
  return context;
}
