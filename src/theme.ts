/**
 * Design tokens, taken from the MetroLens design file.
 *
 * Every token is a CSS variable so the whole app re-skins when `.ml-dark` is applied to
 * the device frame — the palettes themselves live in styles.css. MTA line colours are
 * fixed brand values and never change with the theme.
 */

const v = (name: string) => `var(--ml-${name})`;

export const C = {
  brand: v('brand'),
  brandDark: v('brand-dark'),
  brandTint: v('brand-tint'),
  brandTint2: v('brand-tint2'),
  brandFaint: v('brand-faint'),

  ink: v('ink'),
  ink2: v('ink2'),
  body: v('body'),
  muted: v('muted'),
  soft: v('soft'),
  faint: v('faint'),
  line: v('line'),
  line2: v('line2'),
  line3: v('line3'),
  hair: v('hair'),

  bg: v('bg'),
  bgAlt: v('bg-alt'),
  white: v('surface'),
  /** True white, both themes — text/icons on brand, green, red or scene backgrounds. */
  onColor: '#FFFFFF',
  toggleOff: v('toggle-off'),

  green: v('green'),
  greenDeep: v('green-deep'),
  greenDeeper: v('green-deeper'),
  greenTint: v('green-tint'),
  greenSignal: '#0AA84F',

  amber: v('amber'),
  amberDeep: v('amber-deep'),
  amberDeeper: v('amber-deeper'),
  amberInk: v('amber-ink'),
  amberTint: v('amber-tint'),
  amberBg: v('amber-bg'),
  amberBg2: v('amber-bg2'),

  red: v('red'),
  redDeep: v('red-deep'),
  redDeeper: v('red-deeper'),
  redTint: v('red-tint'),
  redBg: v('red-bg'),
  redBg2: v('red-bg2'),

  violet: '#7A5AF8',
  grey: '#9EA3A8',
  tabOff: v('tab-off'),

  /* Structural extras that used to be hardcoded per screen. */
  rowHi: v('row-hi'),
  seg: v('seg'),
  idle: v('idle'),
  dot: v('dot'),
  track: v('track'),
  tabbar: v('tabbar'),
  tabbarLine: v('tabbar-line'),
} as const;

export const FONT =
  "'Helvetica Neue', Helvetica, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export const R = {
  card: 18,
  panel: 16,
  btn: 14,
  chip: 999,
  inner: 12,
  small: 10,
} as const;

export const SHADOW = {
  card: 'var(--ml-sh-card)',
  cardUp: 'var(--ml-sh-card-up)',
  chip: 'var(--ml-sh-chip)',
  raise: 'var(--ml-sh-raise)',
  brand: '0 6px 16px rgba(18,100,227,.3)',
  brandStrong: '0 6px 16px rgba(18,100,227,.35)',
  green: '0 6px 16px rgba(14,131,69,.3)',
  focus: 'var(--ml-sh-focus)',
  sheet: 'var(--ml-sh-sheet)',
} as const;

/**
 * Status-bar colours per screen. Scene-anchored screens (outdoor sky, green confirm,
 * dark headers) keep fixed colours; the rest follow the theme.
 */
export const STATUS_BAR: Record<string, { bg: string; fg: string }> = {
  splash: { bg: '#1264E3', fg: '#FFFFFF' },
  onb: { bg: C.white, fg: C.ink },
  outdoor: { bg: '#C7D6E4', fg: '#101318' },
  indoor: { bg: '#0B0D10', fg: '#FFFFFF' },
  platform: { bg: '#0E8345', fg: '#FFFFFF' },
  platform2: { bg: '#0E8345', fg: '#FFFFFF' },
  train: { bg: '#0E8345', fg: '#FFFFFF' },
  intrain: { bg: '#0B0D10', fg: '#FFFFFF' },
  exit: { bg: '#1264E3', fg: '#FFFFFF' },
  wrong: { bg: C.redBg2, fg: C.ink },
  wrongway: { bg: C.amberBg2, fg: C.ink },
  lost: { bg: '#101318', fg: '#FFFFFF' },
};
