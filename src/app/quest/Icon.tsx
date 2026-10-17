import { iconUrl } from './icons'

// One of the quest's own icons (quest/icons.ts), scaled up crisp
export function Icon({
  name,
  size = 36,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const src = iconUrl(name)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block max-w-none shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

// A picture from public/art/quest/, scaled up crisp
export function Art({
  name,
  height,
  className = '',
  flip,
}: {
  name: string
  height: number
  className?: string
  flip?: boolean
}) {
  return (
    <img
      src={`/art/quest/${name}.png`}
      alt=""
      height={height}
      className={`inline-block w-auto max-w-none shrink-0 ${className}`}
      style={{
        imageRendering: 'pixelated',
        height,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  )
}
