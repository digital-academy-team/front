export interface CategoryVisuals {
  iconKey: CategoryIconKey;
  colorKey: string;
}

export type CategoryIconKey =
  | 'code'
  | 'briefcase'
  | 'palette'
  | 'trending'
  | 'camera'
  | 'music'
  | 'dumbbell'
  | 'sparkles'
  | 'tag';

const VISUAL_RULES: Array<{ keys: string[]; iconKey: CategoryIconKey; colorKey: string }> = [
  { keys: ['develop', 'program', 'coding', 'software', 'it', 'web', 'ai', 'data'], iconKey: 'code', colorKey: 'development' },
  { keys: ['business', 'finance', 'management', 'entrepreneur', 'account'], iconKey: 'briefcase', colorKey: 'business' },
  { keys: ['design', 'ui', 'ux', 'graphic', 'motion', 'art'], iconKey: 'palette', colorKey: 'design' },
  { keys: ['marketing', 'smm', 'seo', 'brand', 'sales', 'advert'], iconKey: 'trending', colorKey: 'marketing' },
  { keys: ['photo', 'camera', 'video', 'film'], iconKey: 'camera', colorKey: 'photography' },
  { keys: ['music', 'audio', 'sound', 'instrument', 'guitar', 'piano'], iconKey: 'music', colorKey: 'music' },
  { keys: ['fitness', 'health', 'sport', 'workout', 'gym', 'wellness'], iconKey: 'dumbbell', colorKey: 'fitness' },
  { keys: ['lifestyle', 'self', 'productivity', 'mindset', 'language'], iconKey: 'sparkles', colorKey: 'lifestyle' },
];

export function getCategoryVisuals(title?: string, slug?: string): CategoryVisuals {
  const source = `${title ?? ''} ${slug ?? ''}`.toLowerCase().trim();

  for (const rule of VISUAL_RULES) {
    if (rule.keys.some((key) => source.includes(key))) {
      return { iconKey: rule.iconKey, colorKey: rule.colorKey };
    }
  }

  return { iconKey: 'tag', colorKey: 'default' };
}
