type PreferenceExpansion = {
  canonical: string;
  categories?: string[];
  genres?: string[];
  styles?: string[];
  culture?: string[];
  moods?: string[];
};

export type PreferenceProfile = {
  city?: string;
  cityLabel?: string;
  categories: string[];
  interests: string[];
  artForms: string[];
  genres: string[];
  styles: string[];
  culturePreferences: string[];
  moods: string[];
  matchTerms: Set<string>;
  topCategoryLabel: string;
  topInterestLabel: string;
  hasSignals: boolean;
};

const ART_FORMS = new Set(['music', 'dance', 'film', 'drama']);

export const CATEGORY_TO_ART_FORM: Record<string, string | null> = {
  music: 'music',
  concert: 'music',
  concerts: 'music',
  'live music': 'music',
  baila: 'music',
  classical: 'music',
  carnatic: 'music',
  orchestra: 'music',
  choir: 'music',
  'folk music': 'music',
  band: 'music',
  opera: 'music',
  dance: 'dance',
  kandyan: 'dance',
  'kandyan dance': 'dance',
  ballet: 'dance',
  'contemporary dance': 'dance',
  'folk dance': 'dance',
  'low country': 'dance',
  sabaragamuwa: 'dance',
  bharatanatyam: 'dance',
  drama: 'drama',
  theatre: 'drama',
  theater: 'drama',
  play: 'drama',
  nadagam: 'drama',
  kolam: 'drama',
  nurthi: 'drama',
  stage: 'drama',
  teledrama: 'drama',
  film: 'film',
  cinema: 'film',
  movie: 'film',
  screening: 'film',
  documentary: 'film',
  'short film': 'film',
  'film festival': 'film',
  art: null,
  arts: null,
  exhibition: null,
  exhibitions: null,
  gallery: null,
  craft: null,
  crafts: null,
  handicraft: null,
  batik: null,
  handloom: null,
  cultural: null,
  heritage: null,
  festival: null,
  workshop: null,
  seminar: null,
  fair: null,
  expo: null,
  general: null,
};

export const CATEGORY_TO_GENRE: Record<string, string | null> = {
  art: 'visual_arts',
  arts: 'visual_arts',
  exhibition: 'visual_arts',
  exhibitions: 'visual_arts',
  craft: 'traditional_crafts',
  crafts: 'traditional_crafts',
  batik: 'traditional_crafts',
  handloom: 'traditional_crafts',
  cultural: 'cultural_heritage',
  heritage: 'cultural_heritage',
  festival: 'festival',
  folk: 'folk_tradition',
};

export const getCategoryArtForm = (category?: string | null) => {
  if (!category) return null;
  const rawKey = category.trim().toLowerCase();
  const tokenKey = normaliseToken(category);
  return CATEGORY_TO_ART_FORM[rawKey] ?? CATEGORY_TO_ART_FORM[tokenKey] ?? null;
};

export const getCategoryGenre = (category?: string | null) => {
  if (!category) return null;
  const rawKey = category.trim().toLowerCase();
  const tokenKey = normaliseToken(category);
  return CATEGORY_TO_GENRE[rawKey] ?? CATEGORY_TO_GENRE[tokenKey] ?? null;
};

const PREFERENCE_EXPANSIONS: Record<string, PreferenceExpansion> = {
  sinhala_classical: {
    canonical: 'sinhala_classical',
    categories: ['music'],
    genres: ['sinhala_classical', 'light_classical', 'classical_vocal', 'classical_instrumental'],
    styles: ['classical_semi_classical'],
    culture: ['traditional'],
    moods: ['spiritual', 'devotional', 'patriotic'],
  },
  classical_music: {
    canonical: 'sinhala_classical',
    categories: ['music'],
    genres: ['sinhala_classical', 'light_classical', 'classical_vocal', 'classical_instrumental'],
    styles: ['classical_semi_classical'],
    culture: ['traditional'],
    moods: ['spiritual', 'devotional', 'patriotic'],
  },
  folk_fusion: {
    canonical: 'folk_fusion',
    categories: ['music'],
    genres: ['folk_fusion', 'jana_kavi', 'harvest_songs', 'virindu'],
    styles: ['traditional_indigenous', 'fusion'],
    culture: ['traditional', 'fusion'],
    moods: ['traditional', 'rural_village', 'cultural_pride'],
  },
  folk_music: {
    canonical: 'folk_fusion',
    categories: ['music'],
    genres: ['folk_fusion', 'jana_kavi', 'harvest_songs', 'virindu'],
    styles: ['traditional_indigenous', 'fusion'],
    culture: ['traditional', 'fusion'],
    moods: ['traditional', 'rural_village', 'cultural_pride'],
  },
  light_classical: {
    canonical: 'light_classical',
    categories: ['music'],
    genres: ['light_classical', 'sinhala_pop', 'ballads', 'love_songs'],
    styles: ['classical_semi_classical', 'sinhala_commercial'],
    culture: ['traditional', 'contemporary'],
    moods: ['emotional', 'peaceful', 'romantic'],
  },
  sarala_gee: {
    canonical: 'light_classical',
    categories: ['music'],
    genres: ['light_classical', 'sinhala_pop', 'ballads', 'love_songs'],
    styles: ['classical_semi_classical', 'sinhala_commercial'],
    culture: ['traditional', 'contemporary'],
    moods: ['emotional', 'peaceful', 'romantic'],
  },
  classical_fusion: {
    canonical: 'classical_fusion',
    categories: ['music'],
    genres: ['classical_fusion', 'folk_fusion', 'ethnic_electronic', 'traditional_hip_hop_fusion'],
    styles: ['fusion'],
    culture: ['fusion', 'contemporary'],
    moods: ['fusion_energy', 'energetic', 'uplifting'],
  },
  fusion_modern: {
    canonical: 'classical_fusion',
    categories: ['music'],
    genres: ['classical_fusion', 'folk_fusion', 'ethnic_electronic', 'traditional_hip_hop_fusion'],
    styles: ['fusion'],
    culture: ['fusion', 'contemporary'],
    moods: ['fusion_energy', 'energetic', 'uplifting'],
  },
  orchestral_scores: {
    canonical: 'orchestral_scores',
    categories: ['music'],
    genres: ['orchestral_scores', 'background_scores', 'classical_vocal'],
    styles: ['classical_semi_classical', 'film_music'],
    culture: ['traditional'],
    moods: ['peaceful', 'meditative', 'spiritual'],
  },
  classical_instrumental: {
    canonical: 'orchestral_scores',
    categories: ['music'],
    genres: ['orchestral_scores', 'background_scores', 'classical_vocal'],
    styles: ['classical_semi_classical', 'film_music'],
    culture: ['traditional'],
    moods: ['peaceful', 'meditative', 'spiritual'],
  },
  instrumental: {
    canonical: 'orchestral_scores',
    categories: ['music'],
    genres: ['orchestral_scores', 'background_scores', 'classical_vocal'],
    styles: ['classical_semi_classical', 'film_music'],
    culture: ['traditional'],
    moods: ['peaceful', 'meditative', 'spiritual'],
  },
  ves_dance: {
    canonical: 'ves_dance',
    categories: ['dance'],
    genres: ['ves_dance', 'naiyandi', 'pantheru', 'uddekki', 'vannam_dance'],
    styles: ['kandyan_dance'],
    culture: ['traditional'],
    moods: ['ritualistic', 'sacred', 'graceful'],
  },
  upcountry_dance: {
    canonical: 'ves_dance',
    categories: ['dance'],
    genres: ['ves_dance', 'naiyandi', 'pantheru', 'uddekki', 'vannam_dance'],
    styles: ['kandyan_dance'],
    culture: ['traditional'],
    moods: ['ritualistic', 'sacred', 'graceful'],
  },
  kolam_dance: {
    canonical: 'kolam_dance',
    categories: ['dance'],
    genres: ['kolam_dance', 'sanni_yakuma', 'devil_dance', 'ritual_based', 'drum_centered'],
    styles: ['low_country_dance'],
    culture: ['traditional', 'ritual'],
    moods: ['ritualistic', 'fierce', 'theatrical'],
  },
  lowcountry_dance: {
    canonical: 'kolam_dance',
    categories: ['dance'],
    genres: ['kolam_dance', 'sanni_yakuma', 'devil_dance', 'ritual_based', 'drum_centered'],
    styles: ['low_country_dance'],
    culture: ['traditional', 'ritual'],
    moods: ['ritualistic', 'fierce', 'theatrical'],
  },
  harvest_dances: {
    canonical: 'harvest_dances',
    categories: ['dance'],
    genres: ['harvest_dances', 'village_festival_dances', 'new_year_dances'],
    styles: ['folk_dance'],
    culture: ['traditional', 'festival_specific'],
    moods: ['festive', 'joyful', 'rural_village'],
  },
  sabaragamuwa_dance: {
    canonical: 'harvest_dances',
    categories: ['dance'],
    genres: ['harvest_dances', 'village_festival_dances', 'new_year_dances'],
    styles: ['folk_dance'],
    culture: ['traditional', 'festival_specific'],
    moods: ['festive', 'joyful', 'rural_village'],
  },
  sri_lankan_contemporary: {
    canonical: 'sri_lankan_contemporary',
    categories: ['dance'],
    genres: ['sri_lankan_contemporary', 'interpretative', 'theatrical_dance'],
    styles: ['contemporary_modern'],
    culture: ['contemporary'],
    moods: ['expressive', 'graceful', 'dramatic'],
  },
  contemporary_dance: {
    canonical: 'sri_lankan_contemporary',
    categories: ['dance'],
    genres: ['sri_lankan_contemporary', 'interpretative', 'theatrical_dance'],
    styles: ['contemporary_modern'],
    culture: ['contemporary'],
    moods: ['expressive', 'graceful', 'dramatic'],
  },
  social_realism: {
    canonical: 'social_realism',
    categories: ['film'],
    genres: ['social_realism', 'realism', 'social_justice', 'ethnic_conflict'],
    styles: ['art_parallel_cinema', 'political_cinema'],
    culture: ['contemporary', 'educational'],
    moods: ['social_commentary', 'serious', 'reflective'],
  },
  romantic_drama: {
    canonical: 'romantic_drama',
    categories: ['film', 'drama'],
    genres: ['romantic_drama', 'romantic_comedy', 'family_drama', 'romance_series'],
    styles: ['romantic', 'modern_stage_drama'],
    culture: ['contemporary'],
    moods: ['romantic', 'emotional', 'dramatic'],
  },
  ancient_sri_lanka: {
    canonical: 'ancient_sri_lanka',
    categories: ['film'],
    genres: ['ancient_sri_lanka', 'colonial_era', 'biographical', 'jataka_tales'],
    styles: ['historical_period', 'religious_mythological'],
    culture: ['traditional', 'educational'],
    moods: ['historical_nostalgia', 'heroic', 'mythological'],
  },
  low_budget_indie: {
    canonical: 'low_budget_indie',
    categories: ['film'],
    genres: ['low_budget_indie', 'avant_garde', 'festival_cinema', 'symbolic_cinema'],
    styles: ['experimental_independent', 'art_parallel_cinema'],
    culture: ['contemporary'],
    moods: ['reflective', 'social_commentary', 'satirical'],
  },
  nadagam: {
    canonical: 'nadagam',
    categories: ['drama'],
    genres: ['nadagam', 'kolam_theatre', 'sokari'],
    styles: ['traditional_theatre'],
    culture: ['traditional'],
    moods: ['theatrical', 'mythological', 'traditional'],
  },
  stylized_drama: {
    canonical: 'nadagam',
    categories: ['drama'],
    genres: ['nadagam', 'kolam_theatre', 'sokari'],
    styles: ['traditional_theatre'],
    culture: ['traditional'],
    moods: ['theatrical', 'mythological', 'traditional'],
  },
  social_drama: {
    canonical: 'social_drama',
    categories: ['drama'],
    genres: ['social_drama', 'literary_adaptation', 'family_drama'],
    styles: ['modern_stage_drama'],
    culture: ['contemporary'],
    moods: ['dramatic', 'social_awareness', 'emotional'],
  },
  realistic_drama: {
    canonical: 'social_drama',
    categories: ['drama'],
    genres: ['social_drama', 'literary_adaptation', 'family_drama'],
    styles: ['modern_stage_drama'],
    culture: ['contemporary'],
    moods: ['dramatic', 'social_awareness', 'emotional'],
  },
  stage_musicals: {
    canonical: 'stage_musicals',
    categories: ['drama'],
    genres: ['stage_musicals', 'opera', 'physical_theatre'],
    styles: ['musical_drama'],
    culture: ['contemporary', 'entertainment'],
    moods: ['joyful', 'theatrical', 'expressive'],
  },
  comedy_drama: {
    canonical: 'stage_musicals',
    categories: ['drama'],
    genres: ['stage_musicals', 'family_drama', 'romance_series'],
    styles: ['musical_drama', 'modern_stage_drama'],
    culture: ['entertainment'],
    moods: ['comedy', 'humorous', 'satirical'],
  },
  political_theatre: {
    canonical: 'political_theatre',
    categories: ['drama'],
    genres: ['political_theatre', 'social_drama', 'physical_theatre'],
    styles: ['modern_stage_drama', 'experimental_avant_garde'],
    culture: ['contemporary', 'educational'],
    moods: ['political_awareness', 'social_awareness', 'urban_street'],
  },
  street_drama: {
    canonical: 'political_theatre',
    categories: ['drama'],
    genres: ['political_theatre', 'social_drama', 'physical_theatre'],
    styles: ['modern_stage_drama', 'experimental_avant_garde'],
    culture: ['contemporary', 'educational'],
    moods: ['political_awareness', 'social_awareness', 'urban_street'],
  },
};

const DISPLAY_LABELS: Record<string, string> = {
  music: 'Music',
  dance: 'Dance',
  film: 'Film',
  drama: 'Drama',
  sinhala_classical: 'Classical',
  folk_fusion: 'Folk Fusion',
  light_classical: 'Sarala Gee',
  classical_fusion: 'Fusion / Modern',
  orchestral_scores: 'Instrumental',
  classical_instrumental: 'Instrumental',
  ves_dance: 'Upcountry / Kandyan',
  kolam_dance: 'Low Country / Kolam',
  harvest_dances: 'Folk / Festival Dance',
  sri_lankan_contemporary: 'Contemporary Dance',
  social_realism: 'Social Realism',
  romantic_drama: 'Romantic Drama',
  ancient_sri_lanka: 'Historical Cinema',
  low_budget_indie: 'Independent Film',
  nadagam: 'Nadagam / Stylized',
  social_drama: 'Realistic / Social Drama',
  stage_musicals: 'Musical Theatre',
  political_theatre: 'Street / Political Drama',
};

export const normaliseToken = (value?: string | null) =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normaliseCity = (value?: string | null) => normaliseToken(value) || undefined;

const pushUnique = (target: string[], values?: string[]) => {
  for (const rawValue of values || []) {
    const value = normaliseToken(rawValue);
    if (value && !target.includes(value)) {
      target.push(value);
    }
  }
};

const addTerm = (terms: Set<string>, value?: string | null) => {
  const token = normaliseToken(value);
  if (!token) return;
  terms.add(token);
  for (const part of token.split('_')) {
    if (part.length > 2) {
      terms.add(part);
    }
  }
};

export const formatPreferenceLabel = (value?: string | null) => {
  const token = normaliseToken(value);
  if (!token) return 'Not selected';
  return DISPLAY_LABELS[token] || token.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

export const formatCityLabel = (value?: string | null) => formatPreferenceLabel(normaliseCity(value));

export const buildPreferenceProfile = ({
  city,
  categories = [],
  interests = [],
}: {
  city?: string | null;
  categories?: string[] | null;
  interests?: string[] | null;
}): PreferenceProfile => {
  const artForms: string[] = [];
  const canonicalInterests: string[] = [];
  const genres: string[] = [];
  const styles: string[] = [];
  const culturePreferences: string[] = [];
  const moods: string[] = [];
  const matchTerms = new Set<string>();
  const normalisedCity = normaliseCity(city);

  for (const rawCategory of categories || []) {
    const token = normaliseToken(rawCategory);
    const category = getCategoryArtForm(rawCategory);
    if (category && ART_FORMS.has(category)) {
      pushUnique(artForms, [category]);
      addTerm(matchTerms, category);
      continue;
    }
    const genre = getCategoryGenre(rawCategory);
    if (genre) {
      pushUnique(genres, [genre]);
      addTerm(matchTerms, genre);
    } else if (token) {
      addTerm(matchTerms, token);
    }
  }

  for (const rawInterest of interests || []) {
    const token = normaliseToken(rawInterest);
    if (!token) continue;
    const category = getCategoryArtForm(rawInterest);
    if (category && ART_FORMS.has(category)) {
      pushUnique(artForms, [category]);
      addTerm(matchTerms, category);
      continue;
    }

    const genre = getCategoryGenre(rawInterest);
    if (genre) {
      pushUnique(canonicalInterests, [token]);
      pushUnique(genres, [genre]);
      addTerm(matchTerms, genre);
      addTerm(matchTerms, token);
      continue;
    }

    const expansion = PREFERENCE_EXPANSIONS[token];
    if (expansion) {
      pushUnique(canonicalInterests, [expansion.canonical]);
      pushUnique(artForms, expansion.categories);
      pushUnique(genres, expansion.genres);
      pushUnique(styles, expansion.styles);
      pushUnique(culturePreferences, expansion.culture);
      pushUnique(moods, expansion.moods);
      [expansion.canonical, ...(expansion.categories || []), ...(expansion.genres || []), ...(expansion.styles || []), ...(expansion.culture || []), ...(expansion.moods || [])].forEach((value) => addTerm(matchTerms, value));
    } else {
      pushUnique(canonicalInterests, [token]);
      pushUnique(genres, [token]);
      addTerm(matchTerms, token);
    }
  }

  if (normalisedCity) {
    addTerm(matchTerms, normalisedCity);
  }

  const categoriesOut = artForms.length > 0 ? artForms : (categories || []).map(normaliseToken).filter(Boolean);
  const interestsOut = canonicalInterests.length > 0 ? canonicalInterests : (interests || []).map(normaliseToken).filter(Boolean);

  return {
    city: normalisedCity,
    cityLabel: normalisedCity ? formatCityLabel(normalisedCity) : undefined,
    categories: categoriesOut,
    interests: interestsOut,
    artForms,
    genres,
    styles,
    culturePreferences,
    moods,
    matchTerms,
    topCategoryLabel: formatPreferenceLabel(categoriesOut[0]),
    topInterestLabel: formatPreferenceLabel(interestsOut[0]),
    hasSignals: Boolean(normalisedCity || categoriesOut.length || interestsOut.length || genres.length || moods.length),
  };
};

export const preparePreferencesForStorage = (input: {
  city?: string | null;
  categories?: string[] | null;
  interests?: string[] | null;
}) => {
  const profile = buildPreferenceProfile(input);
  return {
    city: profile.city,
    categories: profile.categories,
    interests: profile.interests,
  };
};
