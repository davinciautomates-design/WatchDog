'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CATEGORY_META } from '@watchdog/types'
import type { Category } from '@watchdog/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useUI } from '@/store/ui'
import { submitReport } from '@/lib/api-client'

const REPORTABLE: Category[] = ['POLICE', 'FIRE', 'AMBULANCE', 'CRIME', 'DISTURBANCE', 'SAFETY', 'COMMUNITY']

interface ReportDialogProps {
  userLat: number | null
  userLng: number | null
}

type Step = 'form' | 'success' | 'duplicate'

export function ReportDialog({ userLat, userLng }: ReportDialogProps) {
  const { reportDialogOpen, closeReportDialog } = useUI()
  const queryClient = useQueryClient()

  const [category, setCategory] = useState<Category | null>(null)
  const [description, setDescription] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    closeReportDialog()
    // Reset form after dialog closes
    setTimeout(() => {
      setCategory(null)
      setDescription('')
      setStep('form')
      setError(null)
    }, 200)
  }

  async function handleSubmit() {
    if (!category || description.trim().length < 10) return
    if (!userLat || !userLng) {
      setError('Location not available. Please allow location access and try again.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await submitReport({
        category,
        description: description.trim(),
        lat: userLat,
        lng: userLng,
      })
      // Invalidate events cache so the new report appears on the map
      await queryClient.invalidateQueries({ queryKey: ['events'] })
      setStep(result.data.isDuplicate ? 'duplicate' : 'success')
    } catch (err) {
      const e = err as { message: string }
      setError(e.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = category != null && description.trim().length >= 10 && !submitting

  return (
    <Dialog open={reportDialogOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Incident</DialogTitle>
          <DialogDescription>
            Help your community by reporting what you see. Reports are anonymous.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Category selector */}
            <div>
              <p className="text-sm font-medium mb-2">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {REPORTABLE.map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const active = category === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={[
                        'flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:bg-muted text-foreground',
                      ].join(' ')}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-medium mb-2">
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  ({description.trim().length}/500)
                </span>
              </p>
              <Textarea
                placeholder="Describe what you're seeing… (min 10 characters)"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Location info */}
            <p className="text-xs text-muted-foreground">
              {userLat && userLng
                ? `Using your current location (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`
                : 'Location not available — please allow location access'}
            </p>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? 'Submitting…' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <p className="font-medium">Report submitted</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your report is now visible on the map. Others can upvote it to increase its visibility.
              </p>
            </div>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}

        {step === 'duplicate' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-2xl">
              ↑
            </div>
            <div>
              <p className="font-medium">Similar report already exists</p>
              <p className="text-sm text-muted-foreground mt-1">
                We found a nearby report for the same category. We&apos;ve upvoted it on your behalf.
              </p>
            </div>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
