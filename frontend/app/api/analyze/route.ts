import { buildReport, normalizeUpload, UserError } from "@/lib/analytics";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ detail: "We could not read this upload. Please choose a CSV file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ detail: "Please choose a CSV file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ detail: "File is too large (4 MB maximum)." }, { status: 413 });
  }
  try {
    const text = await file.text();
    const { lines, warnings } = normalizeUpload(text);
    return Response.json(buildReport(lines, "upload", warnings));
  } catch (e) {
    const detail =
      e instanceof UserError ? e.message : "We could not read this file. Please upload an order export in CSV format.";
    return Response.json({ detail }, { status: 400 });
  }
}
