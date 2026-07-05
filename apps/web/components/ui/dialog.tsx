'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

interface DialogContentProps {
  children: ReactNode
  className?: string
}

interface DialogHeaderProps { children: ReactNode }
interface DialogTitleProps { children: ReactNode }
interface DialogDescriptionProps { children: ReactNode }

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>,
    document.body,
  )
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return (
    <div
      className={[
        'relative z-50 w-full bg-background border border-border rounded-lg shadow-xl',
        'max-h-[90vh] overflow-y-auto p-6',
        className,
      ].join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 p-1.5 rounded-md hover:bg-accent transition-colors"
      aria-label="Close dialog"
    >
      <X className="h-4 w-4" />
    </button>
  )
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4 pr-6">{children}</div>
}

export function DialogTitle({ children }: DialogTitleProps) {
  return <h2 className="text-lg font-semibold leading-tight">{children}</h2>
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>
}
