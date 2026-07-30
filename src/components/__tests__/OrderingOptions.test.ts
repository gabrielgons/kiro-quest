import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
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

  it('moves an item directly to the selected position and announces the change', async () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-a', 'step-b', 'step-c'],
        disabled: false,
      },
    });

    await wrapper.get('[data-testid="position-select-step-a"]').setValue('3');

    expect(wrapper.emitted('reorder')?.[0]?.[0]).toEqual([
      'step-b',
      'step-c',
      'step-a',
    ]);
    expect(wrapper.get('[aria-live="polite"]').text()).toBe(
      'Etapa A agora está na posição 3 de 3.',
    );
  });

  it('keeps arrow controls as an accessible alternative', async () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-a', 'step-b', 'step-c'],
        disabled: false,
      },
    });

    const moveUp = wrapper.get('button[aria-label="Mover Etapa B para cima"]');
    await moveUp.trigger('click');

    expect(wrapper.emitted('reorder')?.[0]?.[0]).toEqual([
      'step-b',
      'step-a',
      'step-c',
    ]);
    expect(wrapper.get('button[aria-label="Mover Etapa A para cima"]').attributes('disabled'))
      .toBeDefined();
    expect(wrapper.get('button[aria-label="Mover Etapa C para baixo"]').attributes('disabled'))
      .toBeDefined();
  });

  it('disables every reorder control after the answer is confirmed', () => {
    const wrapper = mount(OrderingOptions, {
      props: {
        items,
        orderedIds: ['step-a', 'step-b', 'step-c'],
        disabled: true,
      },
    });

    expect(wrapper.findAll('select').every((select) => select.attributes('disabled') !== undefined))
      .toBe(true);
    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined))
      .toBe(true);
  });
});
