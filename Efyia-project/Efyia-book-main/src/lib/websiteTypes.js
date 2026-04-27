export const SECTION_TYPES = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width banner with headline, subheadline, and CTA button',
    icon: '🖼',
  },
  {
    type: 'text',
    label: 'Text Block',
    description: 'Rich text content — paragraphs, headings, lists',
    icon: '📝',
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Single image with optional caption',
    icon: '🖼️',
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'Photo grid or masonry layout',
    icon: '🏞',
  },
  {
    type: 'services',
    label: 'Services',
    description: 'Cards listing your services with prices',
    icon: '🎛',
  },
  {
    type: 'pricing',
    label: 'Pricing',
    description: 'Pricing tiers or rate card',
    icon: '💰',
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Client quotes and reviews',
    icon: '💬',
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Accordion of frequently asked questions',
    icon: '❓',
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Contact form or contact details block',
    icon: '📬',
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Bold CTA banner with a button',
    icon: '📣',
  },
];

export function makeDefaultSectionData(type) {
  switch (type) {
    case 'hero':
      return { headline: '', subheadline: '', ctaLabel: 'Book a session', ctaUrl: '', backgroundImageUrl: '', overlayOpacity: 0.45 };
    case 'text':
      return { content: '' };
    case 'image':
      return { url: '', caption: '', alt: '', layout: 'full' };
    case 'gallery':
      return { images: [], columns: 3, style: 'grid' };
    case 'services':
      return { items: [] };
    case 'pricing':
      return { tiers: [], note: '' };
    case 'testimonials':
      return { items: [] };
    case 'faq':
      return { items: [] };
    case 'contact':
      return { email: '', phone: '', showForm: true, mapEmbed: '' };
    case 'cta':
      return { headline: '', body: '', ctaLabel: 'Get started', ctaUrl: '', background: 'accent' };
    default:
      return {};
  }
}

export const SECTION_TYPE_MAP = Object.fromEntries(SECTION_TYPES.map((s) => [s.type, s]));
