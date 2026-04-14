import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getAuthenticatedCharacterId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.characterId ?? null;
}
