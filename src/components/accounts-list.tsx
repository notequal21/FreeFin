'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AccountFormDialog } from '@/components/account-form-dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon } from '@hugeicons/core-free-icons';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: 'USD' | 'RUB';
  created_at: string;
}

interface AccountsListProps {
  accounts: Account[];
}

/**
 * Компонент списка счетов с возможностью создания и редактирования
 */
export function AccountsList({ accounts }: AccountsListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
  };

  const handleCloseEditDialog = () => {
    setEditingAccount(null);
  };

  return (
    <>
      <div className="mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Создать счет
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              У вас пока нет счетов. Создайте первый счет, чтобы начать работу.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-1">{account.name}</CardTitle>
                    <CardDescription>
                      {account.balance.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: account.currency,
                      })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(account)}
                    className="h-8 w-8"
                  >
                    <HugeiconsIcon icon={Edit01Icon} size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/accounts/${account.id}`}>
                  <Button variant="outline" className="w-full">
                    Открыть счет
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модалка создания счета */}
      <AccountFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Модалка редактирования счета */}
      <AccountFormDialog
        open={!!editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseEditDialog();
          }
        }}
        account={editingAccount}
      />
    </>
  );
}

