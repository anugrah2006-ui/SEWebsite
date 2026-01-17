import {type StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Website Content')
    .items([
      S.listItem()
        .title('Home Page')
        .child(
          S.document()
            .schemaType('landingPage')
            .documentId('landingPage')
            .title('Home Page')
        ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !['landingPage'].includes(item.getId()!)
      ),
    ])
