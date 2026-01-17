import { type SchemaTypeDefinition } from 'sanity'
import event from './event'
import partner from './partner'
import landingPage from './landingPage'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [landingPage, event, partner],
}
