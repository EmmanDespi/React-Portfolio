export const AppColors = {
  ink: "#171713",
  paper: "#F3EFE2",
  white: "#FFFEFA",
  lime: "#D7F34A",
  mustard: "#FFBF00",
  coral: "#EF6249",
  pantone: "#211832",
  muted: "#77766F",
  line: "#BCB9AE",
  oatcream: "#C2A178",
  dsBlue: "#38515A",
  deep: "#0E1012",
  oatmilk: "#E2DACB",
  onyx: "#57505C",
  stone: "#4E4A52",
} as const;

export const AppSpacing = {
  xs: 6,
  sm: 12,
  md: 20,
  lg: 32,
  xl: 48,
} as const;

export const AppPalette = {
  light: {
    background: AppColors.paper,
    title: AppColors.deep,
    shell: AppColors.paper,
    card: AppColors.white,
    subcard: AppColors.oatmilk,
    paper: AppColors.lime,
    chip: AppColors.oatmilk,
    ink: AppColors.ink,
    shadow: AppColors.ink,
    buttonShadow: AppColors.ink,
    inActive: AppColors.stone
  },
  dark: {
    background: AppColors.deep,
    title: AppColors.coral,
    shell: AppColors.dsBlue,
    card: AppColors.stone,
    subcard: AppColors.onyx,
    paper: AppColors.mustard,
    chip: AppColors.dsBlue,
    ink: AppColors.paper,
    shadow: AppColors.ink,
    buttonShadow: AppColors.ink,
    inActive: AppColors.stone
  },
} as const;

export type ThemePalette = typeof AppPalette.light;
