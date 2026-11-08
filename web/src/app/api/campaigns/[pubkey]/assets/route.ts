import {
  badRequest,
  conflict,
  dbFailure,
  json,
  route,
} from "@/lib/errors";
import { assetCaptionSchema } from "@/lib/schemas";
import { inspectImage } from "@/lib/server/images";
import {
  STORAGE_BUCKET,
  getOwnedCampaign,
  getViewableCampaign,
  signedUrls,
} from "@/lib/server/helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_IMAGE_BYTES } from "@/lib/types";
import { hexToBytes } from "@/lib/solana/codec";


type Context = { params: Promise<{ pubkey: string }> };

export const GET = route<Context>(async (request, { params }) => {
  const campaign = await getViewableCampaign(request, (await params).pubkey);
  const { data, error } = await supabaseAdmin()
    .from("asset_metadata")
    .select("*")
    .eq("campaign_pubkey", campaign.campaign_pubkey)
    .order("asset_index", { ascending: true });
  if (error) throw dbFailure(error);

  const urls = await signedUrls((data ?? []).map((asset) => asset.storage_path));
  return json({
    items: (data ?? []).map((asset) => ({
      ...asset,
      image_url: urls.get(asset.storage_path) ?? null,
    })),
  });
});

export const POST = route<Context>(async (request, { params }) => {
  const { row } = await getOwnedCampaign(request, (await params).pubkey);
  if (row.onchain_status !== "DRAFT") {
    throw conflict("Assets can only be added while the campaign is a draft");
  }

  const form = await request.formData().catch(() => {
    throw badRequest("Request must be multipart form data");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("Missing image file");
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw badRequest("Image must be between 1 byte and 10 MB");
  }
  const captionEntry = form.get("caption");
  const caption = assetCaptionSchema.parse(
    typeof captionEntry === "string" ? captionEntry : undefined,
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = inspectImage(buffer);

  const admin = supabaseAdmin();

  const { data: existing, error: existingError } = await admin
    .from("asset_metadata")
    .select("asset_index, content_hash")
    .eq("campaign_pubkey", row.campaign_pubkey)
    .order("asset_index", { ascending: false });
  if (existingError) throw dbFailure(existingError);

  const items = existing ?? [];
  if (items.some((item) => item.content_hash === image.sha256Hex)) {
    throw conflict("This image is already part of the campaign");
  }
  const nextIndex = items.length > 0 ? items[0].asset_index + 1 : 0;
  if (nextIndex >= row.expected_asset_count) {
    throw conflict("All declared assets have already been uploaded");
  }

  const storagePath = `${row.campaign_pubkey}/${image.sha256Hex}.${image.extension}`;
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: image.mime, upsert: false });
  if (uploadError) {
    if (/exists|duplicate/i.test(uploadError.message)) {
      throw conflict("This image is already part of the campaign");
    }
    throw dbFailure(uploadError);
  }

  const { data, error } = await admin
    .from("asset_metadata")
    .insert({
      campaign_pubkey: row.campaign_pubkey,
      asset_index: nextIndex,
      content_hash: image.sha256Hex,
      storage_path: storagePath,
      original_filename: file.name ? file.name.slice(0, 255) : null,
      mime_type: image.mime,
      size_bytes: file.size,
      width: image.width,
      height: image.height,
      caption: caption ? caption : null,
    })
    .select("*")
    .single();
  if (error) {
    await admin.storage.from(STORAGE_BUCKET).remove([storagePath]);
    if (error.code === "23505") {
      throw conflict("Another upload claimed this asset index, please retry");
    }
    throw dbFailure(error);
  }

  return json(
    {
      asset: data,
      assetIndex: nextIndex,
      contentHash: image.sha256Hex,
      contentHashBytes: hexToBytes(image.sha256Hex),
    },
    201,
  );
});