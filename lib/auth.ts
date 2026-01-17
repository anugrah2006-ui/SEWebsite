import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import db from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  // Prefer JWT sessions so auth doesn't depend on DB availability
  session: { strategy: 'jwt' },
  // Trust proxy headers for reverse proxy setup
  trustHost: true,
  // Ensure cookie is set for the right host in production
  cookies: (() => {
    try {
      const url = process.env.NEXTAUTH_URL
        ? new URL(process.env.NEXTAUTH_URL)
        : undefined;
      const hostname = url?.hostname;
      const isLocal =
        !hostname || /^(localhost|127\.0\.0\.1|::1)$/.test(hostname);
      // Don't set domain for localhost or reverse proxy setups
      const domain = undefined;
      const secure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
      const name = secure
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token';
      return {
        sessionToken: {
          name,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            secure,
          },
        },
      };
    } catch {
      return undefined as any;
    }
  })(),
  // Enable debug logs if set (helps diagnose issues)
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  // Ensure consistent encryption/signature
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Do not block login on DB errors; persistence handled in events.signIn
      return true;
    },
    async jwt({ token, account, user }) {
      // Fetch once if id/role not present
      if ((token as any).id && (token as any).role) return token;
      const email =
        (user?.email as string) || (token.email as string | undefined);
      if (!email) return token;
      try {
        const [rows] = await db.execute(
          'SELECT id, role FROM users WHERE email = ?',
          [email]
        );
        const u = (rows as any[])[0];
        if (u) {
          (token as any).id = u.id;
          (token as any).role = u.role;
        }
      } catch (error) {
        console.error('[callbacks.jwt] fetch user failed:', error);
      }
      return token;
    },
    async session({ session, token }) {
      // Hydrate from token to avoid DB dependency per request
      if (session.user) {
        session.user.id = (token as any).id;
        // Attempt to fetch the latest role from DB so role changes are reflected
        // immediately without requiring the user to sign out/in.
        try {
          const id = (token as any).id;
          if (id) {
            const [rows] = (await db.execute(
              'SELECT role FROM users WHERE id = ?',
              [id]
            )) as any;
            const u = rows[0];
            session.user.role = u?.role ?? (token as any).role;
          } else {
            session.user.role = (token as any).role;
          }
        } catch (error) {
          console.error('[callbacks.session] failed to hydrate role:', error);
          session.user.role = (token as any).role;
        }
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      try {
        if (!user?.email) return;
        await db.execute(
          `INSERT INTO users (email, name, image)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), image = VALUES(image)`,
          [user.email, user.name, user.image]
        );
      } catch (error) {
        console.error('[events.signIn] user upsert failed:', error);
      }
    },
  },
  logger: {
    error(code, metadata) {
      console.error('[nextauth.error]', code, metadata);
    },
    warn(code) {
      console.warn('[nextauth.warn]', code);
    },
    debug(code, metadata) {
      if (process.env.NEXTAUTH_DEBUG === 'true') {
        console.debug('[nextauth.debug]', code, metadata);
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};
