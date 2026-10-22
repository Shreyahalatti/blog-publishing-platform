export type User = { id: string; name: string; email: string };
export type Comment = {
  id: string;
  content: string;
  createdAt: string;
  author: Pick<User, "id" | "name">;
};
export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string | null;
  createdAt: string;
  author: Pick<User, "id" | "name">;
  _count?: { comments: number };
  comments?: Comment[];
};

const apiUrl = import.meta.env.VITE_API_URL ?? "";

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("inkwell-token");
  const response = await fetch(`${apiUrl}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
