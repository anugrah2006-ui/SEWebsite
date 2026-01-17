import { cache } from 'react';
import { loadHtmlDocument } from './html';

const SECTION_IDS = {
  hero: '6099a9d',
  highlightGrid: '2131275',
  infoGrid: '878be37',
  iconGrid: 'd98122a',
  mediaStrip: 'ceede3b',
};

const buildSectionRegex = (id: string) =>
  new RegExp(
    `<section[^>]*data-id=["']${id}["'][^>]*>[\\s\\S]*?<\\/section>`,
    'i'
  );

const buildTagRegex = (tag: string, attr: string, value: string) =>
  new RegExp(
    `<${tag}[^>]*${attr}=["']${value}["'][^>]*>[\\s\\S]*?<\\/${tag}>`,
    'i'
  );

const extractMatch = (html: string, regex: RegExp) =>
  html.match(regex)?.[0] ?? '';

export const loadHomeSlices = cache(async () => {
  const doc = await loadHtmlDocument([]);
  if (!doc) return null;

  const { body, head, bodyAttributes } = doc;

  const header = extractMatch(
    body,
    buildTagRegex('header', 'data-elementor-type', 'header')
  );
  const footer = extractMatch(
    body,
    buildTagRegex('footer', 'data-elementor-type', 'footer')
  );

  return {
    head,
    bodyAttributes,
    header,
    footer,
    sections: {
      hero: extractMatch(body, buildSectionRegex(SECTION_IDS.hero)),
      highlightGrid: extractMatch(
        body,
        buildSectionRegex(SECTION_IDS.highlightGrid)
      ),
      infoGrid: extractMatch(body, buildSectionRegex(SECTION_IDS.infoGrid)),
      iconGrid: extractMatch(body, buildSectionRegex(SECTION_IDS.iconGrid)),
      mediaStrip: extractMatch(body, buildSectionRegex(SECTION_IDS.mediaStrip)),
    },
  };
});
