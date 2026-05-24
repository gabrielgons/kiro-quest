import { describe, it, expect } from 'vitest'
import { test as fcTest, fc } from '@fast-check/vitest'

describe('fast-check Setup', () => {
  it('fast-check is available', () => {
    expect(fc).toBeDefined()
    expect(fc.integer).toBeDefined()
  })

  fcTest.prop([fc.integer()], { numRuns: 10 })('addition is commutative', (a) => {
    expect(a + 0).toBe(a)
  })
})
