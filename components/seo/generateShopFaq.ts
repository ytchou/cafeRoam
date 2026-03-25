export interface ShopForFaq {
  name: string;
  address?: string;
  mrt?: string | null;
  modeScores?: {
    work?: number | null;
    rest?: number | null;
    social?: number | null;
  } | null;
  taxonomyTags?: Array<{
    id: string;
    dimension: string;
    label: string;
    labelZh: string;
  }>;
  openingHours?: Record<string, string> | null;
}

interface FaqEntry {
  question: string;
  answer: string;
}

export function generateShopFaq(shop: ShopForFaq): FaqEntry[] {
  const faq: FaqEntry[] = [];
  const tags = shop.taxonomyTags ?? [];

  const byDimension = new Map<string, string[]>();
  for (const tag of tags) {
    const bucket = byDimension.get(tag.dimension);
    if (bucket) {
      bucket.push(tag.label);
    } else {
      byDimension.set(tag.dimension, [tag.label]);
    }
  }

  // 1. Remote work suitability (always include — core CafeRoam value prop)
  const workScore = shop.modeScores?.work;
  const funcTags = byDimension.get('functionality') ?? [];
  const workTags =
    funcTags.length > 0 ? funcTags.join(', ') : 'a comfortable workspace';
  if (workScore !== null && workScore !== undefined) {
    const suitability =
      workScore >= 0.7
        ? 'highly suitable'
        : workScore >= 0.4
          ? 'suitable'
          : 'not ideal';
    faq.push({
      question: `Is ${shop.name} good for remote work?`,
      answer: `${shop.name} is ${suitability} for remote work. Features include: ${workTags}.`,
    });
  }

  // 2. Vibe / ambience
  const ambienceTags = byDimension.get('ambience') ?? [];
  if (ambienceTags.length > 0) {
    faq.push({
      question: `What's the vibe at ${shop.name}?`,
      answer: `${shop.name} is known for its ${ambienceTags.join(', ').toLowerCase()} atmosphere.`,
    });
  }

  // 3. Location + MRT
  if (shop.address) {
    const mrtInfo = shop.mrt ? ` It's near ${shop.mrt} MRT station.` : '';
    faq.push({
      question: `Where is ${shop.name} located?`,
      answer: `${shop.name} is located at ${shop.address}.${mrtInfo}`,
    });
  }

  // 4. Coffee offerings (only if coffee tags exist)
  const coffeeTags = byDimension.get('coffee') ?? [];
  if (coffeeTags.length > 0) {
    faq.push({
      question: `What kind of coffee does ${shop.name} serve?`,
      answer: `${shop.name} specializes in ${coffeeTags.join(', ').toLowerCase()}.`,
    });
  }

  // 5. Opening hours (only if available)
  if (shop.openingHours && Object.keys(shop.openingHours).length > 0) {
    const hours = Object.entries(shop.openingHours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(', ');
    faq.push({
      question: `When is ${shop.name} open?`,
      answer: `${shop.name} opening hours: ${hours}.`,
    });
  }

  return faq;
}
