export interface User {
  id: number;
  email: string;
  name: string;
  image?: string;
  role: 'user' | 'admin' | 'author';
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  author_id: number;
  author_name?: string;
  slug: string;
  published: boolean;
  featured_image?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  views_count?: number;
}

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  requirements?: string;
  salary_range?: string;
  apply_link?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type JobType = Job['type'];

export interface JobFilters {
  search?: string;
  type?: JobType | 'all';
  location?: string;
}
