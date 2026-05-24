import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('vitest is configured correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('path alias resolves', async () => {
    // This verifies the @ alias works
    const app = await import('@/App.vue')
    expect(app.default).toBeDefined()
  })
})
