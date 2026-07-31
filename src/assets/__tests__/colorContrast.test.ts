import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const variablesCss = readFileSync(
  resolve(process.cwd(), 'src/assets/variables.css'),
  'utf8',
)
const rootTokens = variablesCss.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? ''
const darkTokens =
  variablesCss.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\}/)?.[1] ?? ''

function readHexToken(block: string, name: string): string | undefined {
  return new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)?.[1]
}

function resolveHexToken(name: string, theme: 'light' | 'dark'): string {
  const value =
    (theme === 'dark' ? readHexToken(darkTokens, name) : undefined) ??
    readHexToken(rootTokens, name)

  if (!value) {
    throw new Error(`Missing hexadecimal color token --${name}`)
  }

  return value
}

function linearChannel(hex: string, offset: number): number {
  const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  return (
    0.2126 * linearChannel(hex, 1) +
    0.7152 * linearChannel(hex, 3) +
    0.0722 * linearChannel(hex, 5)
  )
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first)
  const secondLuminance = relativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

describe.each(['light', 'dark'] as const)(
  '%s theme primary color contrast',
  (theme) => {
    it.each(['primary', 'primary-hover'])(
      'keeps --color-on-primary readable over --color-%s',
      (backgroundToken) => {
        const foreground = resolveHexToken('color-on-primary', theme)
        const background = resolveHexToken(`color-${backgroundToken}`, theme)

        expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
      },
    )
  },
)
