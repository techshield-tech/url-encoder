// Small UI primitives specific to this tool's layout needs (a single-line
// text field, and a labeled read-only field). Follows the same Tailwind
// conventions as ../shell/ui.tsx, but lives here because that file is kept
// byte-identical across every sibling tool repo.

import type { InputHTMLAttributes, ReactNode } from 'react';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ className = '', ...props }: TextFieldProps) {
  return (
    <input
      spellCheck={false}
      className={`w-full rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)] ${className}`}
      {...props}
    />
  );
}

export interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/** A labeled row for displaying (or editing, if `children` is interactive) one URL component. */
export function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-medium text-[var(--color-muted)]">{label}</span>
      {children}
    </div>
  );
}

/** Read-only display value, styled to match TextField but not editable. */
export function StaticValue({ children }: { children: ReactNode }) {
  return (
    <div className="w-full truncate rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-sm text-[var(--color-fg)]">
      {children || <span className="text-[var(--color-muted)]">—</span>}
    </div>
  );
}
