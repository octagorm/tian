import Google from '@auth/core/providers/google'
import { convexAuth } from '@convex-dev/auth/server'
// Not among the package's exports, so by its path: the same module the
// package itself uses
import { SHARED_COOKIE_OPTIONS } from '../node_modules/@convex-dev/auth/dist/server/cookies.js'
import { welcome } from './access'

// Convex Auth marks the cookies of a Google sign-in Partitioned, and Safari
// drops partitioned cookies on the way back from another site
// (https://bugs.webkit.org/show_bug.cgi?id=306194): where Google showed a
// page in between, the sign-in failed and landed on the home page. They are
// set on the sign-in's own site, with nothing to partition, so they are
// plain.
delete (SHARED_COOKIE_OPTIONS as { partitioned?: boolean }).partitioned

// The admin: the only one with /admin (access.ts)
export const ADMIN_EMAIL = 'gormroedder@gmail.com'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Anyone with a verified Google account can sign in, and keep their
    // word bank on the account (access.ts)
    Google({
      profile(profile) {
        if (!profile.email_verified) {
          throw new Error('The Google account has no verified email')
        }
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email.toLowerCase(),
          image: profile.picture,
          emailVerified: true,
        }
      },
    }),
  ],
  callbacks: {
    // A new account is sent to the admin's inbox
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId === null)
        await welcome(ctx, userId)
    },
  },
})
