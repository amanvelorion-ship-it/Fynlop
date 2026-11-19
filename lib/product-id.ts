import { randomUUID } from "node:crypto";

export function createProductId(title: string): string | null {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");

  return slug ? `${slug}-${randomUUID().slice(0, 8)}` : null;
}

export function isValidProductId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{8}$/.test(id);
}
