import { cloneElement, useId, type ReactElement, type ReactNode } from 'react'

/** Keep the label separate from options so select controls have a stable accessible name. */
export function FormField({ label, children }: { label: ReactNode; children: ReactElement<{ id?: string }> }) {
  const id = useId()
  return <div className="flex min-w-0 flex-col gap-1.5 text-[length:var(--text-body-sm)] font-medium">
    <label htmlFor={id}>{label}</label>
    {cloneElement(children, { id })}
  </div>
}
