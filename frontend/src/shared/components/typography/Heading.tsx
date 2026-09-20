import type { ComponentPropsWithoutRef } from 'react'

export type HeadingSize = 'display' | 'page' | 'section' | 'subsection' | 'card' | 'sm'

export type HeadingProps = ComponentPropsWithoutRef<'h1'> & {
  level: 1 | 2 | 3 | 4 | 5 | 6
  size?: HeadingSize
}

const LEVEL_DEFAULT_SIZES: Record<number, HeadingSize> = {
  1: 'page',
  2: 'section',
  3: 'subsection',
  4: 'card',
  5: 'sm',
  6: 'sm',
}

export function Heading({ level, size, className = '', ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  const resolvedSize = size ?? LEVEL_DEFAULT_SIZES[level] ?? 'section'
  return <Tag {...props} className={`heading heading--${resolvedSize} ${className}`.trim()} />
}