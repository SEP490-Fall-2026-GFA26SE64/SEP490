import type { ComponentPropsWithoutRef, ElementType } from 'react'

export type TextVariant =
  | 'lead'
  | 'subtitle'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'eyebrow'
  | 'muted'

export interface TextProps extends ComponentPropsWithoutRef<'p'> {
  as?: ElementType
  variant?: TextVariant
}

const VARIANT_CLASSES: Record<TextVariant, string> = {
  lead: 'text-lead',
  subtitle: 'text-subtitle',
  body: 'text-body-default',
  'body-sm': 'text-body-small',
  caption: 'text-caption',
  eyebrow: 'text-eyebrow',
  muted: 'text-muted-foreground text-sm',
}

export function Text({ as: Component = 'p', variant = 'body', className = '', children, ...props }: TextProps) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.body
  return (
    <Component className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}
