import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert a string to a URL-friendly slug
export function slugify(input: string): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Build a canonical job slug: company-name-job-title-id
export function jobSlug(job: {
  id: number | string;
  company?: string;
  title?: string;
}): string {
  const company = slugify(job.company || '');
  const title = slugify(job.title || '');
  const id = String(job.id);
  return [company, title, id].filter(Boolean).join('-');
}

// Build the name part of the job slug without the id: company-name-job-title
export function jobNameSlug(job: { company?: string; title?: string }): string {
  const company = slugify(job.company || '');
  const title = slugify(job.title || '');
  return [company, title].filter(Boolean).join('-');
}
