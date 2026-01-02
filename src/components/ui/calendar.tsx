'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, CaptionProps, useNavigation } from 'react-day-picker';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CustomCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  // В v9 calendarMonth может быть Date или объектом, используем его напрямую
  const displayMonth =
    props.calendarMonth instanceof Date
      ? props.calendarMonth
      : (props.calendarMonth as { date?: Date; month?: Date })?.date ||
        (props.calendarMonth as { date?: Date; month?: Date })?.month ||
        new Date();

  return (
    <div className='flex justify-between items-center pt-1'>
      <button
        type='button'
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-30',
          'border-border bg-background text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'dark:border-border dark:bg-background dark:text-white',
          'dark:hover:bg-accent dark:hover:text-white'
        )}
      >
        <ChevronLeft className='h-4 w-4 dark:text-white' />
      </button>
      <div className='text-sm font-medium flex-1 text-center'>
        {format(displayMonth, 'LLLL yyyy', { locale: ru })}
      </div>
      <button
        type='button'
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-30',
          'border-border bg-background text-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'dark:border-border dark:bg-background dark:text-white',
          'dark:hover:bg-accent dark:hover:text-white'
        )}
      >
        <ChevronRight className='h-4 w-4 dark:text-white' />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('pt-3 pr-3 pb-3 pl-3', className)}
      classNames={{
        months:
          'relative flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        range_end: 'day-range-end',
        today: 'bg-accent text-accent-foreground',
        outside:
          'day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        disabled: 'text-muted-foreground opacity-50',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      modifiersClassNames={{
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
      }}
      components={{
        // @ts-expect-error - Caption component type may vary in v9
        Caption: CustomCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
