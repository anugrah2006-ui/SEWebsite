import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'landingPage',
  title: 'Home Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'Home Page',
      readOnly: true,
    }),
    defineField({
      name: 'heroHtml',
      title: 'Hero Section (HTML)',
      type: 'text',
      rows: 10,
      description: 'Raw HTML for the Hero section. Use with caution.',
    }),
    defineField({
      name: 'highlightGridHtml',
      title: 'Highlight Grid (HTML)',
      type: 'text',
      rows: 10,
    }),
    defineField({
      name: 'infoGridHtml',
      title: 'Info Grid (Legacy HTML)',
      type: 'text',
      rows: 5,
      description: 'Legacy HTML content for the info grid. Events will be injected dynamically.',
    }),
    defineField({
      name: 'iconGridHtml',
      title: 'Icon Grid (Legacy HTML)',
      type: 'text',
      rows: 5,
      description: 'Legacy HTML content for the icon grid. Partners will be injected dynamically.',
    }),
    defineField({
      name: 'mediaStripHtml',
      title: 'Media Strip (HTML)',
      type: 'text',
      rows: 10,
    }),
    defineField({
      name: 'events',
      title: 'Events Selection',
      type: 'array',
      description: 'Select events to display in the Events section.',
      of: [{ type: 'reference', to: { type: 'event' } }],
    }),
    defineField({
      name: 'partners',
      title: 'Partners Selection',
      type: 'array',
      description: 'Select partners to display in the Ecosystem section.',
      of: [{ type: 'reference', to: { type: 'partner' } }],
    }),
  ],
})
