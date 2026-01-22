import passport from "passport";
import { Strategy as AppleStrategy } from "passport-apple";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LocalStrategy } from "passport-local";
import prisma from "../prisma";
import { comparePassword } from "../utils/auth";

// ========== Local Strategy (Email/Password) ==========
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const customer = await prisma.customer.findFirst({
          where: { email },
          include: { roles: { include: { role: true } } },
        });

        if (!customer) {
          return done(null, false, { message: "Invalid email or password" });
        }

        if (!customer.passwordHash) {
          return done(null, false, {
            message: "Please use OAuth to sign in (Google)",
          });
        }

        const isValidPassword = await comparePassword(
          password,
          customer.passwordHash
        );

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, customer);
      } catch (error) {
        console.error("Error in local strategy:", error);
        return done(error);
      }
    }
  )
);

// ========== Google OAuth Strategy ==========

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:4000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const picture = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("No email found in Google profile"), undefined);
        }

        // Find or create customer
        let customer = await prisma.customer.findFirst({
          where: { email },
          include: { accounts: true },
        });

        if (!customer) {
          // Create new customer
          customer = await prisma.customer.create({
            data: {
              email,
              name,
              picture,
              accounts: {
                create: {
                  provider: "google",
                  providerAccountId: googleId,
                  accessToken,
                  refreshToken,
                  expiresAt: profile._json.exp
                    ? new Date(profile._json.exp * 1000)
                    : null,
                  tokenType: "Bearer",
                  scope: null,
                  idToken: null,
                },
              },
            } as any,
            include: { accounts: true },
          });
        } else {
          // Update or create account for existing customer
          const existingAccount = customer.accounts.find(
            (acc: any) =>
              acc.provider === "google" && acc.providerAccountId === googleId
          );

          if (existingAccount) {
            // Update existing account
            await prisma.account.update({
              where: { id: existingAccount.id },
              data: {
                accessToken,
                refreshToken,
                expiresAt: profile._json.exp
                  ? new Date(profile._json.exp * 1000)
                  : null,
                scope: null,
                idToken: null,
              },
            });
          } else {
            // Create new account for existing customer
            await prisma.account.create({
              data: {
                customerId: customer.id,
                provider: "google",
                providerAccountId: googleId,
                accessToken,
                refreshToken,
                expiresAt: profile._json.exp
                  ? new Date(profile._json.exp * 1000)
                  : null,
                tokenType: "Bearer",
                scope: null,
                idToken: null,
              },
            });
          }

          // Update customer info
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              name,
              picture,
            },
            include: { accounts: true },
          });
        }

        return done(null, customer);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error as Error, undefined);
      }
    }
  )
);

// ========== Apple OAuth Strategy ==========

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID) {
  // Replace literal \n with actual newlines in the private key
  const privateKey = process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

  // console.log("[Apple Strategy] Initializing with config:");
  // console.log(`[Apple Strategy] Client ID: ${process.env.APPLE_CLIENT_ID}`);
  // console.log(`[Apple Strategy] Team ID: ${process.env.APPLE_TEAM_ID}`);
  // console.log(`[Apple Strategy] Key ID: ${process.env.APPLE_KEY_ID}`);
  // console.log(`[Apple Strategy] Private key length: ${privateKey.length}`);
  // console.log(
  //   `[Apple Strategy] Private key starts with: ${privateKey.substring(0, 30)}`
  // );

  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID!,
        privateKeyString: privateKey,
        callbackURL:
          process.env.APPLE_CALLBACK_URL ||
          "http://localhost:4000/api/auth/apple/callback",
        passReqToCallback: false,
      },
      async (
        accessToken: string,
        refreshToken: string,
        idToken: string,
        profile: any,
        done: any
      ) => {
        console.log("[Apple Strategy] Verify callback invoked!");
        console.log(
          `[Apple Strategy] Access Token: ${accessToken ? "present" : "missing"}`
        );
        console.log(
          `[Apple Strategy] Refresh Token: ${refreshToken ? "present" : "missing"}`
        );
        console.log(
          `[Apple Strategy] ID Token: ${idToken ? "present" : "missing"}`
        );
        console.log(`[Apple Strategy] Profile: ${JSON.stringify(profile)}`);

        try {
          // Decode the id_token to extract user information
          // id_token is a JWT with format: header.payload.signature
          let email = profile.email;
          let appleId = profile.id;

          if (!email && idToken) {
            // Parse the JWT payload
            const payload = idToken.split(".")[1];
            const decodedPayload = JSON.parse(
              Buffer.from(payload, "base64").toString()
            );
            console.log(
              `[Apple Strategy] Decoded ID Token: ${JSON.stringify(decodedPayload)}`
            );

            email = decodedPayload.email;
            appleId = decodedPayload.sub;
          }

          const name = profile.name
            ? `${profile.name.firstName || ""} ${profile.name.lastName || ""}`.trim()
            : email?.split("@")[0];

          console.log(
            `[Apple Strategy] Extracted - Email: ${email}, Name: ${name}, AppleID: ${appleId}`
          );

          if (!email) {
            console.error(
              "[Apple Strategy] No email found in profile or id_token"
            );
            return done(
              new Error("No email found in Apple profile"),
              undefined
            );
          }

          // Find or create customer
          let customer = await prisma.customer.findFirst({
            where: { email },
            include: { accounts: true },
          });

          if (!customer) {
            // Create new customer
            customer = await prisma.customer.create({
              data: {
                email,
                name: name || email.split("@")[0],
                picture: null,
                accounts: {
                  create: {
                    provider: "apple",
                    providerAccountId: appleId,
                    accessToken,
                    refreshToken: refreshToken || null,
                    expiresAt: null,
                    tokenType: "Bearer",
                    scope: null,
                    idToken,
                  },
                },
              } as any,
              include: { accounts: true },
            });
          } else {
            // Update or create account for existing customer
            const existingAccount = customer.accounts.find(
              (acc: any) =>
                acc.provider === "apple" && acc.providerAccountId === appleId
            );

            if (existingAccount) {
              // Update existing account
              await prisma.account.update({
                where: { id: existingAccount.id },
                data: {
                  accessToken,
                  refreshToken: refreshToken || null,
                  idToken,
                },
              });
            } else {
              // Create new account for existing customer
              await prisma.account.create({
                data: {
                  customerId: customer.id,
                  provider: "apple",
                  providerAccountId: appleId,
                  accessToken,
                  refreshToken: refreshToken || null,
                  expiresAt: null,
                  tokenType: "Bearer",
                  scope: null,
                  idToken,
                },
              });
            }

            // Update customer info if name is provided
            if (name && name.trim()) {
              customer = await prisma.customer.update({
                where: { id: customer.id },
                data: { name },
                include: { accounts: true },
              });
            }
          }

          console.log("[Apple Strategy] Customer found/created:", customer.id);
          return done(null, customer);
        } catch (error) {
          console.error("[Apple Strategy] Error in verify callback:", error);
          return done(error as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  console.log("[Passport] Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  console.log("[Passport] Deserializing user ID:", id);
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { accounts: true, roles: { include: { role: true } } },
    });
    console.log(
      "[Passport] Deserialized customer:",
      customer ? customer.email : "NOT FOUND"
    );
    done(null, customer);
  } catch (error) {
    console.error("[Passport] Deserialization error:", error);
    done(error, null);
  }
});

export default passport;
