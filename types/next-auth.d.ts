import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: number;
      role?: 'user' | 'admin' | 'author';
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
