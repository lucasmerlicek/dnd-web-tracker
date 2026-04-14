import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const USERS: Record<string, { password: string; characterId: string; characterName: string }> = {
  Madea: { password: "Blackthorn", characterId: "madea", characterName: "Madea Blackthorn" },
  Ramil: { password: "alSaif", characterId: "ramil", characterName: "Ramil al-Sayif" },
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = USERS[credentials.username];
        if (!user || user.password !== credentials.password) return null;
        return {
          id: user.characterId,
          name: user.characterName,
          characterId: user.characterId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.characterId = (user as { characterId: string }).characterId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { characterId?: string }).characterId = token.characterId as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
