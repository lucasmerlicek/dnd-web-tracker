"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-6 rounded-lg border border-dark-border bg-dark-surface p-8"
      >
        <h1 className="text-center font-serif text-2xl text-gold">
          D&amp;D Character Tracker
        </h1>
        {error && (
          <p className="text-center text-sm text-crimson" role="alert">{error}</p>
        )}
        <div>
          <label htmlFor="username" className="mb-1 block text-sm text-parchment">
            Character Name
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-dark-border bg-dark-bg px-3 py-2 text-parchment focus:border-gold focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-parchment">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-dark-border bg-dark-bg px-3 py-2 text-parchment focus:border-gold focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] w-full rounded bg-gold-dark py-2.5 font-serif text-parchment transition hover:bg-gold disabled:opacity-50"
        >
          {loading ? "Entering..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
