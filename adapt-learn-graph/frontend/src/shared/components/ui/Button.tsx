import type { ComponentPropsWithoutRef } from 'react'
import './Button.css'

export function Button({ className = '', type = 'button', ...props }: ComponentPropsWithoutRef<'button'>) {
  return <button {...props} type={type} className={`ui-button ${className}`.trim()} />
}