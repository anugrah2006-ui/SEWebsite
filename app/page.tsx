import { notFound } from 'next/navigation';
import BodyAttributes from './components/BodyAttributes';
import HtmlBlock from './components/HtmlBlock';
import HeaderBlock from './components/HeaderBlock';
import DynamicEvents from './components/Dynamic/DynamicEvents';
import DynamicPartners from './components/Dynamic/DynamicPartners';
import { loadHomeSlices } from './lib/home';

export default async function HomePage() {
  const slices = await loadHomeSlices();
  if (!slices) return notFound();

  const { header, footer, sections, bodyAttributes } = slices;

  return (
    <>
      <BodyAttributes attributes={bodyAttributes} />
      <HeaderBlock html={header} />
      <main id="home-content">
        <HtmlBlock id="hero" html={sections.hero} />
        <HtmlBlock id="highlight-grid" html={sections.highlightGrid} />
        <DynamicEvents initialHtml={sections.infoGrid} />
        <DynamicPartners initialHtml={sections.iconGrid} />
        <HtmlBlock id="media-strip" html={sections.mediaStrip} />
      </main>
      <HtmlBlock id="legacy-footer" html={footer} />
    </>
  );
}
