import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import QuizFlow from '@/views/QuizFlow.vue';
import { useQuizStore } from '@/stores/quizStore';
import { useLocale } from '@/i18n/useLocale';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { stage: 'kiro-basics' } }),
  useRouter: () => ({ push: pushMock }),
}));

describe('QuizFlow safe exit', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockReset();
    useLocale().setLocale('pt-BR');
  });

  it('returns to the stage list without clearing confirmed answers', async () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');
    const currentQuestion = store.currentQuestion;
    expect(currentQuestion).toBeDefined();

    const firstOption = currentQuestion!.options[0]!;
    store.submitAnswer(firstOption.id);
    const answersBeforeExit = [...store.userAnswersByStage['kiro-basics']!];
    const wrapper = mount(QuizFlow);

    expect(wrapper.find('.quiz-exit-hint').text()).toBe(
      'Suas respostas confirmadas ficam salvas.',
    );
    await wrapper.find('button.quiz-exit-button').trigger('click');

    expect(pushMock).toHaveBeenCalledWith('/stages');
    expect(store.userAnswersByStage['kiro-basics']).toEqual(answersBeforeExit);
    expect(store.quizPhase).toBe('feedback');
    wrapper.unmount();
  });

  it('resumes saved progress when the stage is opened directly', () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');
    const firstQuestion = store.currentQuestion;
    expect(firstQuestion).toBeDefined();
    store.submitAnswer(firstQuestion!.options[0]!.id);
    const savedAnswers = [...store.userAnswersByStage['kiro-basics']!];

    store.startStage('specs');
    const wrapper = mount(QuizFlow);

    expect(store.currentStage).toBe('kiro-basics');
    expect(store.currentQuestionIndex).toBe(1);
    expect(store.quizPhase).toBe('answering');
    expect(store.userAnswersByStage['kiro-basics']).toEqual(savedAnswers);
    wrapper.unmount();
  });

  it('submits the order chosen through the position control', async () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');
    store.currentQuestionIndex = 3;
    const wrapper = mount(QuizFlow);

    const itemIdsBeforeMove = wrapper.findAll('[data-testid^="order-item-"]').map(
      (item) => item.attributes('data-testid')!.replace('order-item-', ''),
    );
    expect(itemIdsBeforeMove).toContain('step-1');

    await wrapper.get('[data-testid="position-select-step-1"]').setValue('4');
    await wrapper.get('button.btn-primary').trigger('click');

    const expectedOrder = itemIdsBeforeMove.filter((id) => id !== 'step-1');
    expectedOrder.push('step-1');
    expect(store.userAnswersByStage['kiro-basics']?.[0]?.selectedOptionId).toEqual(
      expectedOrder,
    );
    wrapper.unmount();
  });
});
