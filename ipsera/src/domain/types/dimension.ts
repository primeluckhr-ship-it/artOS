export const IPSERA_DIMENSIONS = [
  "identity",
  "physical",
  "spiritual",
  "economic",
  "relationships",
  "achievement",
] as const;

export type IpseraDimension = (typeof IPSERA_DIMENSIONS)[number];

export interface DimensionMeta {
  id: IpseraDimension;
  label: string;
  question: string;
  description: string;
  colorVar: string;
}

export const DIMENSION_META: Record<IpseraDimension, DimensionMeta> = {
  identity: {
    id: "identity",
    label: "Identity",
    question: "Who am I becoming?",
    description: "Character, values, self-awareness, and personal direction.",
    colorVar: "var(--dimension-identity)",
  },
  physical: {
    id: "physical",
    label: "Physical",
    question: "Am I caring for my body?",
    description: "Health, energy, movement, sleep, and physical vitality.",
    colorVar: "var(--dimension-physical)",
  },
  spiritual: {
    id: "spiritual",
    label: "Spiritual",
    question: "Am I grounded in what matters most?",
    description: "Faith, meaning, purpose, and inner peace.",
    colorVar: "var(--dimension-spiritual)",
  },
  economic: {
    id: "economic",
    label: "Economic",
    question: "Am I building financial freedom?",
    description: "Income, savings, work, and financial stewardship.",
    colorVar: "var(--dimension-economic)",
  },
  relationships: {
    id: "relationships",
    label: "Relationships",
    question: "Am I investing in the people I love?",
    description: "Family, friends, community, and meaningful connection.",
    colorVar: "var(--dimension-relationships)",
  },
  achievement: {
    id: "achievement",
    label: "Achievement",
    question: "Am I making progress on what matters?",
    description: "Goals, projects, learning, and forward momentum.",
    colorVar: "var(--dimension-achievement)",
  },
};

export const DIMENSION_LIST: DimensionMeta[] =
  IPSERA_DIMENSIONS.map((id) => DIMENSION_META[id]);
