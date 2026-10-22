import { useEffect, useState } from 'react'
import { Check, Copy, Rss } from 'lucide-react'
import { Btn, Frame } from '../ui'

// The podcast, 天天: its episodes to play here, and links that open a
// podcast app ready to follow it. The feed and the files are on R2, served
// by the Worker at /podcast/ (scripts/podcast-feed.py puts them there).

const FEED = 'https://tian.ymse.land/podcast/feed.xml'

type Episode = {
  title: string
  description: string
  audio: string
  date: Date
  seconds: number
}

/** Links that open a podcast app ready to follow the feed */
const APPS = (() => {
  const bare = FEED.replace(/^https?:\/\//, '')
  return [
    { app: 'Apple Podcasts', href: `podcast://${bare}` },
    { app: 'Pocket Casts', href: `pktc://subscribe/${bare}` },
    {
      app: 'Overcast',
      href: `overcast://x-callback-url/add?url=${encodeURIComponent(FEED)}`,
    },
  ]
})()

function parse(xml: string): Array<Episode> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return [...doc.querySelectorAll('item')].map((item) => {
    const text = (tag: string) =>
      item.getElementsByTagName(tag).item(0)?.textContent ?? ''
    return {
      title: text('title'),
      description: text('description'),
      audio: item.querySelector('enclosure')?.getAttribute('url') ?? '',
      date: new Date(text('pubDate')),
      seconds: Number(text('itunes:duration')) || 0,
    }
  })
}

export default function Podcast() {
  const [episodes, setEpisodes] = useState<Array<Episode> | null>(null)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // The same feed as the apps get, from this page's own address
    fetch('/podcast/feed.xml')
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((xml) => setEpisodes(parse(xml)))
      .catch(() => setFailed(true))
  }, [])

  const copy = () => {
    void navigator.clipboard.writeText(FEED).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Frame title="Podcast" zh="播客">
      <div className="zh-card fx-rise flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <img
          src="/podcast/cover.jpg"
          width={160}
          height={160}
          alt="The podcast's cover: the seal 天 over the words 天天, Mandarin with Tian"
          className="h-40 w-40 shrink-0 rounded-md shadow-sm"
        />
        <div>
          <h2 className="text-xl font-semibold">天天: Mandarin with Tian</h2>
          <p className="mt-2 text-[var(--ink-2)]">
            Lin, a teacher, and Erik, a learner, talk through words you have met
            in Tian: a taxi ride, a breakfast, an old story, a saying. Every
            word is said slowly, then again for you to say after them. About ten
            minutes an episode, in English and simple Mandarin.
          </p>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Episodes</h2>
      {failed ? (
        <p className="text-[var(--ink-2)]">
          The episodes could not be loaded just now. They are in the feed below,
          for a podcast app.
        </p>
      ) : !episodes ? (
        <p className="text-[var(--ink-2)]">Loading…</p>
      ) : (
        <ol className="space-y-4">
          {episodes.map((ep) => (
            <li key={ep.audio} className="zh-card p-5">
              <h3 className="font-semibold">{ep.title}</h3>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {ep.date.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {ep.seconds > 0 && ` · ${Math.round(ep.seconds / 60)} min`}
              </p>
              <p className="mt-2">{ep.description}</p>
              <audio
                controls
                preload="none"
                src={ep.audio}
                className="mt-3 w-full"
              />
            </li>
          ))}
        </ol>
      )}

      <h2 className="mt-8 mb-3 text-lg font-semibold">Follow in an app</h2>
      <p className="mb-3 text-[var(--ink-2)]">
        On your phone, pick the app you use, and new episodes come to it by
        themselves.
      </p>
      <div className="flex flex-wrap gap-2">
        {APPS.map((a) => (
          <a key={a.app} href={a.href}>
            <Btn kind="ghost">{a.app}</Btn>
          </a>
        ))}
      </div>
      <p className="mt-5 mb-2 text-[var(--ink-2)]">
        In another app, add a podcast by its address:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex min-w-0 items-center gap-2 rounded bg-[var(--paper-2)] px-3 py-2 text-sm break-all">
          <Rss size={16} className="shrink-0" />
          {FEED}
        </code>
        <Btn kind="ghost" onClick={copy}>
          <span className="inline-flex items-center gap-1.5">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </Btn>
      </div>
    </Frame>
  )
}
