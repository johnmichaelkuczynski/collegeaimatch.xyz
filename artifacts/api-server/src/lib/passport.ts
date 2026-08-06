import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function getCallbackUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
  }
  // Production domains — pick first custom domain if available
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const custom = domains.find((d) => !d.endsWith(".replit.app") && !d.endsWith(".replit.dev"));
  const domain = custom ?? domains[0] ?? "collegeaimatch.xyz";
  return `https://${domain}/api/auth/google/callback`;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: getCallbackUrl(),
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value ?? "";
        const name = profile.displayName ?? email;
        const picture = profile.photos?.[0]?.value ?? null;

        const existing = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.googleId, googleId))
          .limit(1);

        if (existing.length > 0) {
          return done(null, existing[0]);
        }

        const [created] = await db
          .insert(usersTable)
          .values({ googleId, email, name, picture })
          .returning();

        return done(null, created);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: number }).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    done(null, user ?? null);
  } catch (err) {
    done(err);
  }
});

export default passport;
