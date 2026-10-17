import type { Look } from '../pixel/Pix'

// The dumpling stall: what it sells, by which measure word, and the orders
// customers give – a fixed set, made from a seed, so each has a voice.

export interface Item {
  id: string
  mw: string
  sprite: string
  price: number
}

export const MENU: Array<Item> = [
  { id: '饺子', mw: '盘', sprite: 'dumplings', price: 15 },
  { id: '包子', mw: '个', sprite: 'bun', price: 3 },
  { id: '面条', mw: '碗', sprite: 'noodles', price: 12 },
  { id: '牛肉面', mw: '碗', sprite: 'beef-noodles', price: 18 },
  { id: '米饭', mw: '碗', sprite: 'rice', price: 2 },
  { id: '汤', mw: '碗', sprite: 'soup', price: 6 },
  { id: '鸡蛋', mw: '个', sprite: 'egg', price: 2 },
  { id: '油条', mw: '根', sprite: 'youtiao', price: 3 },
  { id: '茶', mw: '杯', sprite: 'tea', price: 5 },
  { id: '豆浆', mw: '杯', sprite: 'soy-milk', price: 4 },
  { id: '可乐', mw: '瓶', sprite: 'cola', price: 5 },
  { id: '啤酒', mw: '瓶', sprite: 'beer', price: 8 },
]

export interface ShopOrder {
  zh: string
  want: Record<string, number>
  voice: string
}

const NUM = ['', '一', '两', '三', '四', '五']
export const CUSTOMER_VOICES = ['Achird', 'Sulafat', 'Umbriel', 'Laomedeia']
export const CUSTOMERS: Array<Look> = [
  { style: 'short', coat: '#3d6fa8' },
  { style: 'bun', old: true, coat: '#6b4fa0' },
  { style: 'short', glasses: true, coat: '#1f1a17' },
  { style: 'pony', coat: '#e07a9a' },
  { style: 'short', beard: true, coat: '#8a5a3c' },
  { style: 'long', coat: '#2f7d6d' },
  { style: 'bald', old: true, coat: '#d8d2c6' },
  { style: 'spiky', coat: '#e07a2a' },
]

// A small seeded random, so the orders are the same on every build
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function makeOrders(n: number): Array<ShopOrder> {
  const r = rng(20261015)
  const out: Array<ShopOrder> = []
  const seen = new Set<string>()
  while (out.length < n) {
    const kinds = r() < 0.45 ? 1 : r() < 0.8 ? 2 : 3
    // Fisher–Yates with the seeded random: the same in every browser
    const menu = [...MENU]
    for (let i = menu.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[menu[i], menu[j]] = [menu[j], menu[i]]
    }
    const items = menu.slice(0, kinds)
    const want: Record<string, number> = {}
    const parts = items.map((it) => {
      const k = 1 + Math.floor(r() * (it.price > 10 ? 2 : 4))
      want[it.id] = k
      return `${NUM[k]} ${it.mw} ${it.id}`
    })
    const opener = ['我 要', '我 想 要', '请 给 我=me'][Math.floor(r() * 3)]
    const body =
      parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(' ， ')} 和 ${parts.at(-1)}`
    const closer = r() < 0.4 ? ' ， 谢谢 ！' : ' 。'
    const zh = `${opener} ${body}${closer}`
    if (seen.has(zh)) continue
    seen.add(zh)
    out.push({
      zh,
      want,
      voice: CUSTOMER_VOICES[out.length % CUSTOMER_VOICES.length],
    })
  }
  return out
}

export const SHOP_ORDERS = makeOrders(48)
