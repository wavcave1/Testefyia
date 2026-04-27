import HeroEditor from './editors/HeroEditor';
import TextEditor from './editors/TextEditor';
import ImageEditor from './editors/ImageEditor';
import GalleryEditor from './editors/GalleryEditor';
import ServicesEditor from './editors/ServicesEditor';
import PricingEditor from './editors/PricingEditor';
import TestimonialsEditor from './editors/TestimonialsEditor';
import FaqEditor from './editors/FaqEditor';
import ContactEditor from './editors/ContactEditor';
import CtaEditor from './editors/CtaEditor';

const EDITORS = {
  hero: HeroEditor,
  text: TextEditor,
  image: ImageEditor,
  gallery: GalleryEditor,
  services: ServicesEditor,
  pricing: PricingEditor,
  testimonials: TestimonialsEditor,
  faq: FaqEditor,
  contact: ContactEditor,
  cta: CtaEditor,
};

export default function SectionEditor({ section, onUpdate }) {
  const Editor = EDITORS[section.type];
  if (!Editor) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No editor for type: {section.type}</p>;
  }
  return (
    <div className="wb-section-editor">
      <Editor data={section.data || {}} onChange={(updates) => onUpdate(section.id, updates)} />
    </div>
  );
}
