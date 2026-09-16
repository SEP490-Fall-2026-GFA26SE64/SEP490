import type { ComponentPropsWithoutRef } from 'react'

type HeadingProps = ComponentPropsWithoutRef<'h1'> & {
  level: 1 | 2 | 3 | 4 | 5 | 6
  size?: 'page' | 'section'
}

export function Heading({ level, size = 'section', className = '', ...props }: HeadingProps) {
  const Tag = `h${level}` as const
  return <Tag {...props} className={`heading heading--${size} ${className}`.trim()} />
}