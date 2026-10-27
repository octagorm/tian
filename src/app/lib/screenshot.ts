// A picture for the feedback form (feedback.tsx), pasted or chosen: drawn
// at most MAX_SIDE wide or tall and saved as JPEG, smaller each try until
// it is under MAX_BYTES, which convex/feedback.ts allows with room to spare.
// Not WebP: the inbox on an iPhone showed it as a broken picture.

const MAX_SIDE = 2000
const MAX_BYTES = 1_500_000

export type Shot = { type: string; bytes: ArrayBuffer; url: string }

const blobOf = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality))

export async function shrink(file: Blob): Promise<Shot> {
  if (!file.type.startsWith('image/')) throw new Error('Not a picture')
  const bitmap = await createImageBitmap(file)
  let side = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  try {
    for (let quality = 0.9; ; quality -= 0.15) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * side))
      canvas.height = Math.max(1, Math.round(bitmap.height * side))
      const g = canvas.getContext('2d')
      if (!g) throw new Error('No canvas')
      // Transparent parts on white, as JPEG would have them anyway
      g.fillStyle = '#fff'
      g.fillRect(0, 0, canvas.width, canvas.height)
      g.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const blob = await blobOf(canvas, 'image/jpeg', quality)
      if (!blob) throw new Error('Not drawn')
      if (blob.size <= MAX_BYTES || quality < 0.4) {
        if (blob.size > MAX_BYTES) {
          side *= 0.7
          quality = 1.05
          continue
        }
        return {
          type: blob.type,
          bytes: await blob.arrayBuffer(),
          url: URL.createObjectURL(blob),
        }
      }
    }
  } finally {
    bitmap.close()
  }
}

// The first picture among what was pasted or dropped
export function pictureIn(data: DataTransfer | null): File | null {
  for (const f of Array.from(data?.files ?? []))
    if (f.type.startsWith('image/')) return f
  return null
}
