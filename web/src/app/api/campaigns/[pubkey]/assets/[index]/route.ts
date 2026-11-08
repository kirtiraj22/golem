import { PublicKey } from "@solana/web3.js";

import {
  conflict,
  dbFailure,
  forbidden,
  json,
  readJson,
  route,
  unprocessable,
} from "@/lib/errors";
import { assetIndexSchema, signatureBodySchema } from "@/lib/schemas";
import { fetchAsset, getConnection } from "@/lib/server/chain";
import {
  STORAGE_BUCKET,
  getOwnedCampaign,
} from "@/lib/server/helpers";
import { indexTransaction } from "@/lib/server/index-tx";
import { verifyTransaction } from "@/lib/server/verify-tx";
import { COMMITMENT } from "@/lib/solana/constants";
import { findAssetPda } from "@/lib/solana/pda";
import { supabaseAdmin } from "@/lib/supabase/admin";


type Context = { params: Promise<{ pubkey: string; index: string }> };

export const POST = route<Context>(async (request, { params }) => {
  const resolved = await params;
  const assetIndex = assetIndexSchema.parse(resolved.index);
  const { row, session } = await getOwnedCampaign(request, resolved.pubkey);
  const body = signatureBodySchema.parse(await readJson(request));

  const admin = supabaseAdmin();
  const { data: stored, error: storedError } = await admin
    .from("asset_metadata")
    .select("*")
    .eq("campaign_pubkey", row.campaign_pubkey)
    .eq("asset_index", assetIndex)
    .maybeSingle();
  if (storedError) throw dbFailure(storedError);
  if (!stored) throw unprocessable("No uploaded image exists for this asset index");

  const [expectedAsset] = findAssetPda(new PublicKey(row.campaign_pubkey), assetIndex);

  const verified = await verifyTransaction(body.signature);
  const registered = verified.instructions.find(
    (ix) =>
      ix.name === "register_asset" &&
      ix.campaign === row.campaign_pubkey &&
      ix.wallet === session.wallet &&
      ix.asset === expectedAsset.toBase58(),
  );
  if (!registered) {
    throw forbidden("Transaction does not register this asset for this campaign");
  }

  const onchain = await fetchAsset(expectedAsset);
  if (!onchain) throw unprocessable("Asset account not found on-chain");
  if (onchain.contentHash !== stored.content_hash) {
    throw unprocessable("On-chain content hash does not match the uploaded image");
  }

  const { data, error } = await admin
    .from("asset_metadata")
    .update({
      asset_pubkey: onchain.pubkey,
      register_tx_signature: body.signature,
    })
    .eq("campaign_pubkey", row.campaign_pubkey)
    .eq("asset_index", assetIndex)
    .select("*")
    .single();
  if (error) throw dbFailure(error);

  await indexTransaction(verified);
  return json({ asset: data });
});

export const DELETE = route<Context>(async (request, { params }) => {
  const resolved = await params;
  const assetIndex = assetIndexSchema.parse(resolved.index);
  const { row } = await getOwnedCampaign(request, resolved.pubkey);
  if (row.onchain_status !== "DRAFT") {
    throw conflict("Assets can only be removed while the campaign is a draft");
  }

  const admin = supabaseAdmin();
  const { data: items, error: listError } = await admin
    .from("asset_metadata")
    .select("asset_index, asset_pubkey, storage_path")
    .eq("campaign_pubkey", row.campaign_pubkey)
    .order("asset_index", { ascending: false });
  if (listError) throw dbFailure(listError);

  const last = (items ?? [])[0];
  if (!last || last.asset_index !== assetIndex) {
    throw conflict("Only the most recently uploaded asset can be removed");
  }

  const [pda] = findAssetPda(new PublicKey(row.campaign_pubkey), assetIndex);
  const info = await getConnection().getAccountInfo(pda, COMMITMENT);
  if (info) throw conflict("This asset is already registered on-chain");

  const { error: deleteError } = await admin
    .from("asset_metadata")
    .delete()
    .eq("campaign_pubkey", row.campaign_pubkey)
    .eq("asset_index", assetIndex);
  if (deleteError) throw dbFailure(deleteError);

  await admin.storage.from(STORAGE_BUCKET).remove([last.storage_path]);
  return json({ ok: true });
});