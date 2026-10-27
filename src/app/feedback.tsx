import { useEffect, useRef, useState } from 'react'
import { useAction } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Check, ImagePlus, Send, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useStore } from './lib/store'
import { pictureIn, shrink } from './lib/screenshot'
import { Btn } from './ui'
import type { Shot } from './lib/screenshot'

// At the foot of the home page: a few words to Gorm's inbox
// (convex/feedback.ts), with a screenshot pasted, dropped or chosen, and a
// name or address if the sender wants an answer. Signed in, the account's
// name and address are filled in, to be changed or cleared.
const MAX_TEXT = 1800
const MAX_FROM = 100

const WHY: Record<string, string> = {
  'Too many': 'Many messages have come in just now. Try again in a while.',
  'Not a picture': 'That picture could not be sent. Try another.',
}

export function Feedback() {
  const { account } = useStore()
  const send = useAction(api.feedback.send)
  const [text, setText] = useState('')
  const [from, setFrom] = useState('')
  const [touched, setTouched] = useState(false)
  const [shot, setShot] = useState<Shot | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const pick = useRef<HTMLInputElement>(null)
  const me = account.me
  useEffect(() => {
    if (me && !touched) setFrom(me.name ? `${me.name} (${me.email})` : me.email)
  }, [me, touched])
  // The preview's address is let go when it is replaced or the form goes
  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url)
    },
    [shot],
  )

  const attach = async (file: File | null) => {
    if (!file) return
    try {
      setShot(await shrink(file))
      if (state === 'error') setState('idle')
    } catch {
      setError('That picture could not be read. Try another.')
      setState('error')
    }
  }

  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!text.trim() || state === 'busy') return
    setState('busy')
    try {
      await send({
        text,
        from: from.trim() || undefined,
        image: shot ? { type: shot.type, bytes: shot.bytes } : undefined,
      })
      setText('')
      setShot(null)
      setState('sent')
    } catch (err) {
      setError(
        (err instanceof ConvexError && WHY[String(err.data)]) ||
          'That did not go through. Try again.',
      )
      setState('error')
    }
  }

  const field =
    'w-full rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2 font-normal text-[var(--ink)] focus:border-[var(--gold)] focus:outline-none'
  return (
    <section
      aria-labelledby="zh-feedback"
      className="zh-card mx-auto mt-14 max-w-xl p-5 text-left sm:p-6"
    >
      <h2 id="zh-feedback" className="zh-head text-[1.4rem] text-[var(--ink)]">
        Feedback
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        Something wrong, something missing, or something you liked? It goes
        straight to Gorm, who makes Tian. A screenshot helps show a problem.
      </p>
      {state === 'sent' ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-bold text-[var(--jade)]">
            <Check size={18} /> Thank you, it has been sent.
          </p>
          <Btn kind="ghost" onClick={() => setState('idle')}>
            Write another
          </Btn>
        </div>
      ) : (
        <form
          onSubmit={(e) => void submit(e)}
          onPaste={(e) => {
            const file = pictureIn(e.clipboardData)
            if (file) {
              e.preventDefault()
              void attach(file)
            }
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            const file = pictureIn(e.dataTransfer)
            setOver(false)
            if (file) {
              e.preventDefault()
              void attach(file)
            }
          }}
          className={`mt-4 grid gap-3 rounded-xl ${over ? 'outline-3 outline-offset-4 outline-[var(--gold)] outline-dashed' : ''}`}
        >
          <label className="grid gap-1 text-sm font-bold text-[var(--ink)]">
            Your message
            <textarea
              required
              rows={4}
              maxLength={MAX_TEXT}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${field} resize-y`}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {shot ? (
              <span className="relative inline-block">
                <img
                  src={shot.url}
                  alt="The screenshot to send"
                  className="max-h-28 max-w-56 rounded-lg border-2 border-[var(--paper-2)] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setShot(null)}
                  aria-label="Remove the picture"
                  title="Remove the picture"
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)] shadow hover:bg-[var(--red)]"
                >
                  <X size={15} />
                </button>
              </span>
            ) : (
              <>
                <Btn kind="ghost" onClick={() => pick.current?.click()}>
                  <ImagePlus size={16} /> Add a picture
                </Btn>
                <span className="text-[var(--ink-2)] max-sm:hidden">
                  or paste one here
                </span>
              </>
            )}
            <input
              ref={pick}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void attach(e.target.files?.[0] ?? null)
                e.target.value = ''
              }}
            />
          </div>
          <label className="grid gap-1 text-sm font-bold text-[var(--ink)]">
            <span>
              Your name or email{' '}
              <span className="font-normal text-[var(--ink-2)]">
                (optional, if you would like an answer)
              </span>
            </span>
            <input
              type="text"
              autoComplete="email"
              maxLength={MAX_FROM}
              value={from}
              onChange={(e) => {
                setTouched(true)
                setFrom(e.target.value)
              }}
              className={field}
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {state === 'error' && (
              <p role="alert" className="mr-auto text-sm text-[var(--red)]">
                {error}
              </p>
            )}
            <Btn type="submit" disabled={!text.trim() || state === 'busy'}>
              <Send size={16} /> {state === 'busy' ? 'Sending…' : 'Send'}
            </Btn>
          </div>
        </form>
      )}
    </section>
  )
}
