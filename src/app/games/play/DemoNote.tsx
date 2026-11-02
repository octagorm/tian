import { FlaskConical } from 'lucide-react'
import type { ReactNode } from 'react'

// A line over each practice demo: what it is, and a way back to the others
export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-2 text-sm text-[var(--ink-2)]">
      <FlaskConical
        size={16}
        className="mt-0.5 shrink-0 text-[var(--gold-2)]"
      />
      <span>
        {children}{' '}
        <a href="#play" className="font-semibold text-[var(--red)] underline">
          Other demos
        </a>
      </span>
    </p>
  )
}
