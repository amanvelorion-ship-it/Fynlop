export async function POST() {
  return Response.json(
    { error: "Individual purchases are no longer available. Subscribe to a collection to access its releases." },
    { status: 410 },
  );
}
