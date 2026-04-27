// ─── Studio public page theming config ──────────────────────────────────────
// These drive layout/font/color selection in StudioPublicPage and ProfileCustomizer

export const FONT_PAIRINGS = {
  modern: {
    label: 'Modern',
    description: 'Inter + Inter — clean, neutral, professional',
    headingFamily: "'Inter', sans-serif",
    bodyFamily: "'Inter', sans-serif",
    headingWeight: 700,
    cssClass: 'font-modern',
  },
  editorial: {
    label: 'Editorial',
    description: 'Playfair Display + Inter — sophisticated, magazine-feel',
    headingFamily: "'Playfair Display', Georgia, serif",
    bodyFamily: "'Inter', sans-serif",
    headingWeight: 700,
    cssClass: 'font-editorial',
  },
  minimal: {
    label: 'Minimal',
    description: 'DM Sans + DM Sans — airy, understated, flexible',
    headingFamily: "'DM Sans', system-ui, sans-serif",
    bodyFamily: "'DM Sans', system-ui, sans-serif",
    headingWeight: 500,
    cssClass: 'font-minimal',
  },
  bold: {
    label: 'Bold',
    description: 'Space Grotesk + Inter — loud, energetic, urban',
    headingFamily: "'Space Grotesk', system-ui, sans-serif",
    bodyFamily: "'Inter', sans-serif",
    headingWeight: 700,
    cssClass: 'font-bold',
  },
  warm: {
    label: 'Warm',
    description: 'Lora + Source Sans 3 — organic, welcoming, acoustic',
    headingFamily: "'Lora', Georgia, serif",
    bodyFamily: "'Source Sans 3', sans-serif",
    headingWeight: 600,
    cssClass: 'font-warm',
  },
};

export const LAYOUT_TYPES = {
  minimal: {
    label: 'Minimal',
    description: 'Centered, clean — content leads',
    preview: '▬▬▬',
  },
  hero: {
    label: 'Hero',
    description: 'Full-width cover with overlay text',
    preview: '█████',
  },
  split: {
    label: 'Split',
    description: 'Image left, info right — two-column',
    preview: '▌▌ ▬▬',
  },
  grid: {
    label: 'Grid',
    description: 'Services and media card grid',
    preview: '▩▩▩',
  },
  magazine: {
    label: 'Magazine',
    description: 'Sticky sidebar + editorial numbered sections',
    preview: '▌ ▬▬▬',
  },
  card: {
    label: 'Card',
    description: 'Bold masthead with auto-fill content cards',
    preview: '▬ ▩ ▩ ▩',
  },
};

// Google Fonts import URLs keyed by pairing
export const FONT_URLS = {
  modern: null, // Inter already loaded globally
  editorial:
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap',
  minimal:
    'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
  bold:
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap',
  warm:
    'https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Source+Sans+3:wght@400;600&display=swap',
};

/**
 * Build CSS custom properties string for a studio's branding.
 * Returns an object suitable for use as `style` prop on the page root.
 */
export function buildStudioVars(studio) {
  const accent = studio.accentColor || '#62f3d4';
  const font = FONT_PAIRINGS[studio.fontPairing] || FONT_PAIRINGS.modern;

  // Derive a darkened version of accent for hover/contrast
  return {
    '--studio-accent': accent,
    '--studio-heading-font': font.headingFamily,
    '--studio-body-font': font.bodyFamily,
    '--studio-heading-weight': font.headingWeight,
  };
}
