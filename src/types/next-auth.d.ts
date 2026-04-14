import "next-auth";

declare module "next-auth" {
  interface User {
    characterId: string;
  }
  interface Session {
    user: {
      name?: string | null;
      characterId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    characterId: string;
  }
}
