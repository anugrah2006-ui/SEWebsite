/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js Catch-all Routes.
 */
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config'; // Adjusted path to root
import '../../globals.css'; // Ensure globals are loaded if needed, or stick to studio styles

export const dynamic = 'force-static';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <NextStudio config={config} />;
}
