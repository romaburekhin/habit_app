export const HABIT_COLORS: string[] = [
  '#86EFAC', // green
  '#E6F4E3', // light green
  '#FEF3C5', // yellow
  '#F9A8D4', // pink
  '#FFCCD5', // cherry
  '#93C5FD', // blue
  '#FCA5A5', // coral
  '#C4B5FD', // purple
]

export const GRAY_COLOR = '#9CA3AF'

// Per-color overrides for card background, unfilled and filled circle colors.
// If a color is not listed here the default opacity-suffix logic applies.
export const COLOR_VARIANTS: Record<string, { card: string; unfilled: string; filled: string }> = {
  '#FEF3C5': {
    card: '#FEF5D1',
    unfilled: '#FCE55A',
    filled: '#F7C502',
  },
  '#FDE047': {
    card: '#FEF3C5',
    unfilled: '#FCE889',
    filled: '#F7C502',
  },
  '#F9A8D4': {
    card: '#FFD9E4',
    unfilled: '#FEBECF',
    filled: '#FF4278',
  },
  '#FFCCD5': {
    card: '#FFE6EA',
    unfilled: '#FFB3C1',
    filled: '#C9184A',
  },
  '#86EFAC': {
    card: '#B7F4E2',
    unfilled: '#7FEDCA',
    filled: '#01D16F',
  },
  '#93C5FD': {
    card: '#D6F0FF',
    unfilled: '#B2E4FF',
    filled: '#3AB7F9',
  },
  '#C4B5FD': {
    card: '#EBE1FE',
    unfilled: '#D2BCFC',
    filled: '#A06CD5',
  },
  '#FCA5A5': {
    card: '#FFDED9',
    unfilled: '#FFB5A9',
    filled: '#FC6A53',
  },
  '#E6F4E3': {
    card: '#E6F4E3',
    unfilled: '#B7DAB0',
    filled: '#84C976',
  },
  '#9CA3AF': {
    card: '#E5E7EB',
    unfilled: '#D1D5DB',
    filled: '#9CA3AF',
  },
}
