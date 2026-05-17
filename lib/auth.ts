import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authConfig = {
  pages: {
    signIn: "/login"
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },

  providers: [
    Credentials({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email"
        },

        password: {
          label: "Password",
          type: "password"
        }
      },

      async authorize(credentials) {
        const parsed =
          loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user =
          await prisma.user.findUnique({
            where: {
              email: parsed.data.email
            }
          });

        if (!user || !user.isActive) {
          return null;
        }

        const ok = await bcrypt.compare(
          parsed.data.password,
          user.password
        );

        if (!ok) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          managerId: user.managerId
        };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const appUser =
          user as typeof user & {
            role: string;
            department: string;
            managerId?: string | null;
          };

        token.id = appUser.id;
        token.role = appUser.role;
        token.department =
          appUser.department;
        token.managerId =
          appUser.managerId ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(
          token.id
        );

        session.user.role = String(
          token.role
        ) as
          | "EMPLOYEE"
          | "MANAGER"
          | "ADMIN";

        session.user.department =
          String(
            token.department ?? ""
          );

        session.user.managerId =
          (token.managerId as
            | string
            | null
            | undefined) ?? null;
      }

      return session;
    }
  },

  trustHost: true,

  secret:
    process.env.NEXTAUTH_SECRET,

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV ===
        "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",

      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure:
          process.env.NODE_ENV ===
          "production"
      }
    }
  }

} satisfies NextAuthConfig;

export const {
  handlers,
  auth,
  signIn,
  signOut
} = NextAuth(authConfig);