import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Download, Share } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { COUNTRIES } from '../data/words'
import { SPEED_SAMPLE } from '../data/extra'
import { useStore } from '../lib/store'
import { dayKey } from '../lib/bank'
import { blip, say } from '../lib/audio'
import { setMusic, setSoundEffects, setVolume, useSound } from '../lib/music'
import { parts, subscribe, support, unsubscribe, zone } from '../lib/reminder'
import { Btn, Frame, useInstall } from '../ui'
import type { ReactNode } from 'react'

// Settings: where the player is from, how strict typing is, sound and
// music, the daily reminder, installing the page, and starting over

export default function Settings() {
  const { settings, setSettings, reset } = useStore()
  const sound = useSound()
  const install = useInstall()
  return (
    <Frame title="Settings" zh="设置">
      <Group title="You">
        <Row
          title="Where you are from"
          text="Used on the trip, when people ask."
        >
          <select
            value={settings.home}
            onChange={(e) => setSettings({ home: e.target.value })}
            className="rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2"
          >
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.g} {c.h}
              </option>
            ))}
          </select>
        </Row>
      </Group>

      <Group title="Learning">
        <Row
          title="Typing needs tones"
          text="When on, type tone numbers (ni3hao3) or marks. When off, nihao is enough."
        >
          <Switch
            label="Typing needs tones"
            on={settings.tones}
            set={(tones) => setSettings({ tones })}
          />
        </Row>
        <Row
          title="New words per scene"
          text="How many words each trip scene turns into Chinese."
        >
          <input
            type="number"
            min={0}
            max={10}
            value={settings.perScene}
            onChange={(e) =>
              setSettings({
                perScene: Math.max(0, Math.min(10, Number(e.target.value))),
              })
            }
            className="w-20 rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2"
          />
        </Row>
      </Group>

      <Group title="Sound">
        <Row
          title="Play speech by itself"
          text="On the trip, people speak as their lines appear."
        >
          <Switch
            label="Play speech by itself"
            on={settings.autoplay}
            set={(autoplay) => setSettings({ autoplay })}
          />
        </Row>
        <Row title="Speech speed" text={`${Math.round(settings.rate * 100)} %`}>
          <span className="flex items-center gap-2">
            <input
              type="range"
              min={0.6}
              max={1.2}
              step={0.05}
              value={settings.rate}
              onChange={(e) => setSettings({ rate: Number(e.target.value) })}
              className="accent-[var(--red)]"
              aria-label="Speech speed"
            />
            <Btn
              kind="ghost"
              className="px-2 py-1 text-sm"
              onClick={() => void say(SPEED_SAMPLE.text, SPEED_SAMPLE.voice)}
            >
              Try
            </Btn>
          </span>
        </Row>
        <Row
          title="Music"
          text="A zither in the old five-note scale, slow and quiet. It steps back when words are spoken."
        >
          <Switch label="Music" on={sound.music} set={setMusic} />
        </Row>
        <Row
          title="Sound effects"
          text="A wood block for right, a low string for wrong, bells for a win."
        >
          <Switch
            label="Sound effects"
            on={sound.effects}
            set={(on) => {
              setSoundEffects(on)
              if (on) blip('right')
            }}
          />
        </Row>
        <Row
          title="Volume"
          text="Of the music and the effects; speech is as loud as your device."
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerUp={() => blip('tick')}
            className="accent-[var(--red)]"
            aria-label="Volume"
          />
        </Row>
      </Group>

      <Group title="Reminder">
        <Reminder />
      </Group>

      {install && (
        <Group title="On your phone">
          <Row
            title="Keep it on your home screen"
            text={
              install === 'ios' ? (
                <>
                  In Safari, tap Share{' '}
                  <Share size={14} className="inline align-[-2px]" />, then Add
                  to Home Screen. It opens full screen, like an app.
                </>
              ) : (
                'It opens in its own window, like an app.'
              )
            }
          >
            {install !== 'ios' && (
              <Btn kind="jade" onClick={install}>
                <Download size={16} /> Install
              </Btn>
            )}
          </Row>
        </Group>
      )}

      <Group title="Start over">
        <Row
          title="Forget everything"
          text="Every word, star and score in this browser."
        >
          <Btn
            kind="ghost"
            onClick={() => {
              if (confirm('Forget everything you have learnt here?')) reset()
            }}
          >
            Reset
          </Btn>
        </Row>
      </Group>
    </Frame>
  )
}

// A notification each day at a time of the player's choosing, unless
// Today's session is done (lib/reminder.ts). The permission is asked for
// from the tap that turns it on, as Safari wants.
function Reminder() {
  const { bank, settings, setSettings } = useStore()
  const key = useQuery(api.reminders.key)
  const set = useMutation(api.reminders.set)
  const remove = useMutation(api.reminders.remove)
  const [busy, setBusy] = useState(false)
  const [trouble, setTrouble] = useState<string | null>(null)
  const can = support()
  const blocked = can === 'yes' && Notification.permission === 'denied'

  const turn = async (on: boolean) => {
    setBusy(true)
    setTrouble(null)
    try {
      if (on) {
        if (!key) throw new Error('No key')
        const allowed = await Notification.requestPermission()
        if (allowed !== 'granted') {
          if (allowed === 'default')
            setTrouble('It needs your permission to show notifications.')
          return
        }
        const today = dayKey(Date.now())
        await set({
          ...parts(await subscribe(key)),
          time: settings.remindAt,
          zone: zone(),
          done: bank.daily[today] ? today : undefined,
        })
        setSettings({ remind: true })
      } else {
        setSettings({ remind: false })
        const endpoint = await unsubscribe()
        // If this fails, the push service will say the subscription is gone
        if (endpoint) await remove({ endpoint }).catch(() => {})
      }
    } catch {
      setTrouble(
        on
          ? 'It could not be turned on just now. Try again in a moment.'
          : 'It could not be turned off just now. Try again in a moment.',
      )
    } finally {
      setBusy(false)
    }
  }

  const text =
    can === 'home-screen' ? (
      <>
        On an iPhone or iPad, this works only in Tian on your home screen: in
        Safari, tap Share <Share size={14} className="inline align-[-2px]" />,
        then Add to Home Screen, and turn it on there.
      </>
    ) : can === 'old-ios' ? (
      'Notifications from a home screen app need iOS 16.4 or later.'
    ) : can === 'no' ? (
      'This browser cannot show notifications from a web page.'
    ) : blocked ? (
      'Notifications from Tian are blocked. Allow them in the settings of your browser or phone, then turn this on.'
    ) : key === null ? (
      'Reminders are not available here yet.'
    ) : (
      'A notification at this time each day, unless you have done Today’s session already.'
    )

  return (
    <Row title="Remind me each day" text={trouble ?? text}>
      {can === 'yes' && (
        <span className="flex items-center gap-3">
          <input
            type="time"
            value={settings.remindAt}
            onChange={(e) => {
              if (e.target.value)
                setSettings({ remindAt: e.target.value.slice(0, 5) })
            }}
            aria-label="Time of the reminder"
            className="rounded-xl border-2 border-[var(--paper-2)] bg-white px-3 py-2"
          />
          <Switch
            label="Remind me each day"
            on={settings.remind}
            set={(on) => void turn(on)}
            disabled={busy || (!settings.remind && (!key || blocked))}
          />
        </span>
      )}
    </Row>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="zh-head mb-2.5 text-xl text-[var(--ink-2)]">{title}</h2>
      <div className="zh-card divide-y divide-[var(--paper-2)] overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function Row({
  title,
  text,
  children,
}: {
  title: string
  text: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4">
      <span className="min-w-0 flex-1 basis-56">
        <span className="block font-bold">{title}</span>
        <span className="text-sm text-[var(--ink-2)]">{text}</span>
      </span>
      {children}
    </div>
  )
}

// An on–off switch, as a button
function Switch({
  label,
  on,
  set,
  disabled = false,
}: {
  label: string
  on: boolean
  set: (on: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => set(!on)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-[var(--jade)]' : 'bg-[var(--paper-3)]'}`}
    >
      <span
        className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : ''}`}
      />
    </button>
  )
}
