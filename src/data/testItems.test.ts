import {
  getMultiSelectQuestion,
  getScreenSection,
  getValueSlider,
  SCREEN_SEQUENCE,
} from '@/data/testItems';

describe('testItems screen metadata', () => {
  it('derives the correct section for the service-history screens without a transition', () => {
    const army1Screen = SCREEN_SEQUENCE.find(
      (screen) => screen.kind === 'multi-select' && screen.questionId === 'ARMY-1',
    );
    const army2Screen = SCREEN_SEQUENCE.find(
      (screen) => screen.kind === 'multi-select' && screen.questionId === 'ARMY-2',
    );

    expect(army1Screen).toBeDefined();
    expect(army2Screen).toBeDefined();
    expect(getScreenSection(army1Screen!)).toBe(3);
    expect(getScreenSection(army2Screen!)).toBe(3);
  });

  it('stays aligned with the underlying question and slider metadata', () => {
    const styleScreen = SCREEN_SEQUENCE.find(
      (screen) => screen.kind === 'multi-select' && screen.questionId === 'Q4',
    );
    const valueScreen = SCREEN_SEQUENCE.find(
      (screen) => screen.kind === 'value-slider' && screen.sliderId === 'V2',
    );

    expect(styleScreen).toBeDefined();
    expect(valueScreen).toBeDefined();
    expect(getScreenSection(styleScreen!)).toBe(getMultiSelectQuestion('Q4')?.section);
    expect(getScreenSection(valueScreen!)).toBe(getValueSlider('V2')?.section);
  });
});
