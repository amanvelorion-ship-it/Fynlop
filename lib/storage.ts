export function parseStoragePath(fileUrl: string | null | undefined) {
  if (!fileUrl) return null;

  const [bucket, ...segments] = fileUrl.split("/");
  if (
    !bucket ||
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  return { bucket, path: segments.join("/") };
}
