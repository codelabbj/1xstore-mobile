import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm',
        secondary:
          'bg-secondary text-secondary-foreground',
        destructive:
          'bg-destructive text-destructive-foreground',
        outline:
          'border border-input bg-background text-foreground',
        success:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        warning:
          'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
