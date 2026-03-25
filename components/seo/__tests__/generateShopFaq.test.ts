import { describe, it, expect } from 'vitest';
import { generateShopFaq } from '../generateShopFaq';

describe('generateShopFaq', () => {
  const baseShop = {
    name: 'Café Flâneur',
    address: '台北市大安區復興南路一段219巷18號',
    mrt: '大安站',
    modeScores: { work: 0.85, rest: 0.60, social: 0.40 },
    taxonomyTags: [
      { id: 'laptop_friendly', dimension: 'functionality', label: 'Laptop Friendly', labelZh: '適合帶筆電' },
      { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' },
      { id: 'pour_over', dimension: 'coffee', label: 'Pour Over', labelZh: '手沖咖啡' },
      { id: 'deep_work', dimension: 'mode', label: 'Deep Work', labelZh: '深度工作' },
    ],
    openingHours: { Mon: '08:00-18:00', Tue: '08:00-18:00' },
  };

  it('generates FAQ about remote work suitability when work score is high', () => {
    const faq = generateShopFaq(baseShop);
    const workQuestion = faq.find((q) => q.question.includes('remote work'));
    expect(workQuestion).toBeDefined();
    expect(workQuestion!.answer).toContain('Café Flâneur');
    expect(workQuestion!.answer).toMatch(/laptop|work/i);
  });

  it('generates FAQ about location with MRT station', () => {
    const faq = generateShopFaq(baseShop);
    const locationQuestion = faq.find((q) => q.question.includes('located'));
    expect(locationQuestion).toBeDefined();
    expect(locationQuestion!.answer).toContain('大安站');
  });

  it('generates FAQ about vibe from ambience tags', () => {
    const faq = generateShopFaq(baseShop);
    const vibeQuestion = faq.find((q) => q.question.includes('vibe'));
    expect(vibeQuestion).toBeDefined();
    expect(vibeQuestion!.answer).toContain('Quiet');
  });

  it('generates FAQ about coffee when coffee tags exist', () => {
    const faq = generateShopFaq(baseShop);
    const coffeeQuestion = faq.find((q) => q.question.includes('coffee'));
    expect(coffeeQuestion).toBeDefined();
    expect(coffeeQuestion!.answer).toContain('Pour Over');
  });

  it('skips coffee FAQ when no coffee tags', () => {
    const shopNoCoffee = {
      ...baseShop,
      taxonomyTags: baseShop.taxonomyTags.filter((t) => t.dimension !== 'coffee'),
    };
    const faq = generateShopFaq(shopNoCoffee);
    const coffeeQuestion = faq.find((q) => q.question.includes('coffee'));
    expect(coffeeQuestion).toBeUndefined();
  });

  it('returns 3-5 questions', () => {
    const faq = generateShopFaq(baseShop);
    expect(faq.length).toBeGreaterThanOrEqual(3);
    expect(faq.length).toBeLessThanOrEqual(5);
  });
});
