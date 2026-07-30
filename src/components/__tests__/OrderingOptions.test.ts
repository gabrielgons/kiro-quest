import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { VueDraggable } from 'vue-draggable-plus';
import OrderingOptions from '@/components/OrderingOptions.vue';
import { useLocale } from '@/i18n/useLocale';
import type { OrderingItem } from '@/data/types';

const items: OrderingItem[] = [
  { id: 'step-a', label: 'Etapa A' },
  { id: 'step-b', label: 'Etapa B' },
  { id: 'step-c', label: 'Etapa C' },
];

describe('OrderingOptions', () => {
  beforeEach(() => {
    useLocale().setLocale('pt-BR');
  });

  it('renders items using the selected order', () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-c', 'step-a', 'step-b'],
        disabled: false,
      },
    });

    expect(wrapper.findAll('.order-label').map((item) => item.text())).toEqual([
      'Etapa C',
      'Etapa A',
      'Etapa B',
    ]);
  });

  it('moves the last item to the first position in one drag lifecycle', async () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-a', 'step-b', 'step-c'],
        disabled: false,
      },
    });

    const draggable = wrapper.getComponent(VueDraggable);
    expect(draggable.props('handle')).toBe('.drag-handle');
    expect(draggable.props('animation')).toBe(180);

    const draggedElement = wrapper.get('[data-order-id="step-c"]').element;
    const values = draggable.props('modelValue') as OrderingItem[];
    const reorderedValues = [values[2]!, values[0]!, values[1]!];

    draggable.vm.$emit('start', {
      item: draggedElement,
      oldIndex: 2,
    });
    draggable.vm.$emit('update:modelValue', reorderedValues);
    await wrapper.vm.$nextTick();
    draggable.vm.$emit('end', {
      item: draggedElement,
      oldIndex: 2,
      newIndex: 0,
    });

    await vi.waitFor(() => {
      expect(wrapper.emitted('reorder')).toHaveLength(1);
      expect(wrapper.emitted('reorder')?.[0]?.[0]).toEqual([
        'step-c',
        'step-a',
        'step-b',
      ]);
      expect(wrapper.get('[aria-live="polite"]').text()).toBe(
        'Etapa C agora está na posição 1 de 3.',
      );
    });
  });

  it('disables drag and drop after the answer is confirmed', async () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-a', 'step-b', 'step-c'],
        disabled: true,
      },
    });

    expect(wrapper.getComponent(VueDraggable).props('disabled')).toBe(true);
    expect(wrapper.get('.order-list').classes()).toContain('is-disabled');
  });
});
