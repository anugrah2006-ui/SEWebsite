import LegacyHead from './components/LegacyHead';
import { loadHomeSlices } from './lib/home';

export default async function Head() {
  const slices = await loadHomeSlices();
  if (!slices) return null;

  return <LegacyHead headHtml={slices.head} />;
}
