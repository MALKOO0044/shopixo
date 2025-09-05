import crypto from "crypto";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    return new Response(
      JSON.stringify({ ok: false, message: "Cloudinary environment variables are not fully configured." }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Build the signature string in alphabetical order of params
  // We sign at least timestamp and upload_preset; you can add folder, tags, etc. if needed.
  const signatureBase = `timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');

  return new Response(
    JSON.stringify({ ok: true, timestamp, signature, apiKey, cloudName, uploadPreset }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}
