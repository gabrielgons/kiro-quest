import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StageSelect from '@/views/StageSelect.vue';
import { useQuizStore } from '@/stores/quizStore';
import { useLocale } from '@/i18n/useLocale';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('StageSelect navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    pushMock.mockReset();
    useLocale().setLocale('pt-BR');
  });

  it('resumes an in-progress stage without starting a new attempt', async () => {
    const store = useQuizStore();
    store.currentStage = 'kiro-basics';
    store.userAnswersByStage['kiro-basics'] = [
      {
        questionId: 'q1',
        selectedOptionId: 'a',
        isCorrect: true,
        answeredAt: 1704067200000,
      },
    ];
    const startSpy = vi.spyOn(store, 'startStage');
    const resumeSpy = vi.spyOn(store, 'resumeStage').mockImplementation(() => undefined);
    const wrapper = mount(StageSelect);

    await wrapper.find('button.stage-card').trigger('click');

    expect(resumeSpy).toHaveBeenCalledWith('kiro-basics');
    expect(startSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/quiz/kiro-basics');
    wrapper.unmount();
  });

  it('keeps and resumes progress after the user switches to another stage', async () => {
    const store = useQuizStore();
    store.startStage('kiro-basics');
    const firstQuestion = store.currentQuestion;
    expect(firstQuestion).toBeDefined();
    store.submitAnswer(firstQuestion!.options[0]!.id);
    const savedAnswers = [...store.userAnswersByStage['kiro-basics']!];

    store.startStage('specs');
    expect(store.currentStage).toBe('specs');

    const wrapper = mount(StageSelect);
    const firstStageCard = wrapper.findAll('button.stage-card')[0];
    expect(firstStageCard).toBeDefined();
    expect(firstStageCard!.classes()).toContain('status-in-progress');

    await firstStageCard!.trigger('click');

    expect(store.currentStage).toBe('kiro-basics');
    expect(store.currentQuestionIndex).toBe(1);
    expect(store.quizPhase).toBe('answering');
    expect(store.userAnswersByStage['kiro-basics']).toEqual(savedAnswers);
    expect(pushMock).toHaveBeenCalledWith('/quiz/kiro-basics');
    wrapper.unmount();
  });

  it('opens the summary for a completed stage', async () => {
    const store = useQuizStore();
    store.completedStages.push('kiro-basics');
    const startSpy = vi.spyOn(store, 'startStage');
    const resumeSpy = vi.spyOn(store, 'resumeStage');
    const wrapper = mount(StageSelect);

    await wrapper.find('button.stage-card').trigger('click');

    expect(startSpy).not.toHaveBeenCalled();
    expect(resumeSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/summary/kiro-basics');
    wrapper.unmount();
  });

  it('starts a new attempt for a stage without progress', async () => {
    const store = useQuizStore();
    const startSpy = vi.spyOn(store, 'startStage').mockImplementation(() => undefined);
    const resumeSpy = vi.spyOn(store, 'resumeStage');
    const wrapper = mount(StageSelect);

    await wrapper.find('button.stage-card').trigger('click');

    expect(startSpy).toHaveBeenCalledWith('kiro-basics');
    expect(resumeSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/quiz/kiro-basics');
    wrapper.unmount();
  });
});
