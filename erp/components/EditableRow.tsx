'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { buttonClass } from './ui';

const Editing = createContext<{ open: string | null; toggle: (id: string) => void }>({
  open: null,
  toggle: () => {},
});

/**
 * Wraps a table whose rows can be edited. The open row's form is shown under
 * the table at full width, so it never overflows the table on narrow screens.
 */
export function EditableTable({
  children,
  editors,
}: {
  children: React.ReactNode;
  /** Edit form per row id. */
  editors: Record<string, React.ReactNode>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);
  return (
    <Editing.Provider value={{ open, toggle: (id) => setOpen((o) => (o === id ? null : id)) }}>
      {children}
      {open && editors[open] && (
        <div ref={panel} className="border-t border-line bg-canvas p-5">
          {editors[open]}
        </div>
      )}
    </Editing.Provider>
  );
}

/** A row of an <EditableTable>, with its edit toggle and other actions in the last cell. */
export function EditableRow({
  id,
  children,
  actions,
  editable = true,
  label,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  editable?: boolean;
  label: string;
  className?: string;
}) {
  const { open, toggle } = useContext(Editing);
  const isOpen = open === id;
  return (
    <tr className={`${className} ${isOpen ? 'bg-sand/60' : ''}`}>
      {children}
      <td>
        <div className="flex items-center justify-end gap-1">
          {editable && (
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(id)}
              className={buttonClass('ghost', 'sm')}
              title={label}
            >
              {isOpen ? <X size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
              <span className="sr-only">{label}</span>
            </button>
          )}
          {actions}
        </div>
      </td>
    </tr>
  );
}
