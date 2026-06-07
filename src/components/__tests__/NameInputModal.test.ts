import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import fc from 'fast-check'
import NameInputModal from '../NameInputModal.vue'

/**
 * Tests for NameInputModal name length validation.
 *
 * Property 8: Name Input Length Validation
 *   For any string entered in the Name Input Modal, the modal SHALL reject names
 *   exceeding 60 characters and accept names of 60 characters or fewer.
 *
 * Validates: Requirement 3.2
 *
 * The modal exposes its validation through the "Confirmar" button: it is disabled
 * (computed `isTooLong = name.length > 60`) when the name is too long, and the
 * `confirm` event is only emitted for a valid (length <= 60) name.
 */

const MAX_LENGTH = 60

function mountModal() {
  return mount(NameInputModal, {
    props: { visible: true },
    // The component wraps its content in <Teleport to="body">. Stubbing teleport
    // renders the content inline so it can be queried via the wrapper.
    global: { stubs: { teleport: true } },
  })
}

const CONFIRM_SELECTOR = 'button.modal-button--primary'
const INPUT_SELECTOR = 'input.modal-input'

describe('NameInputModal - name length validation', () => {
  // ---- Unit tests: specific examples and boundary values ----

  it('accepts an empty name (Confirmar enabled by default)', () => {
    const wrapper = mountModal()
    const confirmBtn = wrapper.find(CONFIRM_SELECTOR)
    expect(confirmBtn.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('accepts a name of exactly 60 characters (boundary, Confirmar enabled, emits confirm)', async () => {
    const wrapper = mountModal()
    const name = 'a'.repeat(MAX_LENGTH)

    await wrapper.find(INPUT_SELECTOR).setValue(name)

    const confirmBtn = wrapper.find(CONFIRM_SELECTOR)
    expect(confirmBtn.attributes('disabled')).toBeUndefined()

    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
    expect(wrapper.emitted('confirm')?.[0]).toEqual([name])

    wrapper.unmount()
  })

  it('rejects a name of 61 characters (boundary, Confirmar disabled, no confirm emitted)', async () => {
    const wrapper = mountModal()
    const name = 'a'.repeat(MAX_LENGTH + 1)

    await wrapper.find(INPUT_SELECTOR).setValue(name)

    const confirmBtn = wrapper.find(CONFIRM_SELECTOR)
    expect(confirmBtn.attributes('disabled')).toBeDefined()

    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeFalsy()

    wrapper.unmount()
  })

  // ---- Property 8: Name Input Length Validation ----
  // Validates: Requirement 3.2

  it('Property 8: accepts any name with length <= 60 (Confirmar enabled, confirm emitted)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: MAX_LENGTH }), async (value) => {
        const wrapper = mountModal()
        try {
          await wrapper.find(INPUT_SELECTOR).setValue(value)

          const confirmBtn = wrapper.find(CONFIRM_SELECTOR)
          // length <= 60 => not too long => button enabled
          expect(confirmBtn.attributes('disabled')).toBeUndefined()

          await confirmBtn.trigger('click')
          // A valid name emits 'confirm' with the trimmed value
          expect(wrapper.emitted('confirm')).toBeTruthy()
          expect(wrapper.emitted('confirm')?.[0]).toEqual([value.trim()])
        } finally {
          wrapper.unmount()
        }
      }),
      { numRuns: 40 },
    )
  })

  it('Property 8: rejects any name with length > 60 (Confirmar disabled, confirm not emitted)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: MAX_LENGTH + 1, maxLength: 200 }),
        async (value) => {
          const wrapper = mountModal()
          try {
            // Set the input value directly to exercise the isTooLong computed
            // (the maxlength attribute only constrains interactive typing).
            await wrapper.find(INPUT_SELECTOR).setValue(value)

            const confirmBtn = wrapper.find(CONFIRM_SELECTOR)
            // length > 60 => too long => button disabled
            expect(confirmBtn.attributes('disabled')).toBeDefined()

            await confirmBtn.trigger('click')
            // An invalid name must NOT emit 'confirm'
            expect(wrapper.emitted('confirm')).toBeFalsy()
          } finally {
            wrapper.unmount()
          }
        },
      ),
      { numRuns: 40 },
    )
  })
})
