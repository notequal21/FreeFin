import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { Header } from '@/components/header';
import { AppLayout } from '@/components/app-layout';
import { ApprovalPending } from '@/components/approval-pending';
import { getAuth } from '@/lib/auth';
import { TransactionDialogProvider } from '@/contexts/transaction-dialog-context';

// Настройка шрифта Outfit согласно пресету shadcn
const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FreeFin - Учет финансов для фрилансеров',
  description: 'Приложение для учета доходов и расходов',
};

/**
 * Проверяет, является ли путь страницей авторизации
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Получаем путь из заголовков запроса (устанавливается middleware)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // Проверяем, является ли это страницей авторизации
  const isAuth = isAuthPage(pathname);

  // Если это не страница авторизации, проверяем статус одобрения пользователя
  let shouldShowApprovalPending = false;
  if (!isAuth) {
    try {
      const authData = await getAuth();
      // Если пользователь залогинен, но не одобрен, показываем только окно ожидания
      // Если пользователь не залогинен (authData === null), это нормально для страниц авторизации
      if (authData && (!authData.profile || !authData.profile.is_approved)) {
        shouldShowApprovalPending = true;
      }
    } catch (error) {
      // Если произошла ошибка (например, нет переменных окружения), показываем обычный layout
      // Это позволит пользователю увидеть страницу с ошибкой вместо белого экрана
      console.error('Ошибка проверки авторизации в layout:', error);
    }
  }

  return (
    <html lang='ru' suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <TransactionDialogProvider>
            {shouldShowApprovalPending ? (
              // Если пользователь не одобрен, показываем только окно ожидания
              <ApprovalPending />
            ) : (
              // Иначе показываем обычный layout с Header и Sidebar
              <AppLayout>
                <Header />
                <main className='flex-1'>{children}</main>
              </AppLayout>
            )}
            <Toaster position='top-center' richColors />
          </TransactionDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
