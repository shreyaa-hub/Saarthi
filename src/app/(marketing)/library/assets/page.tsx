import { getOptionalClinician } from "@/lib/auth/session";
import { getPublicAssets } from "@/lib/data/library";
import { LibraryAssetGrid } from "@/components/marketing/library-asset-grid";
import { Reveal } from "@/components/motion/reveal";

export default async function AssetLibraryPage() {
  const { supabase, clinicianId } = await getOptionalClinician();
  const assets = await getPublicAssets(supabase);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Asset Library</h1>
        <p className="mt-3 text-muted-foreground">
          Photorealistic images, illustrations, icons, and pictograms ready to drop onto any canvas.
        </p>
      </Reveal>

      <div className="mt-10">
        <LibraryAssetGrid assets={assets} viewerId={clinicianId} />
      </div>
    </div>
  );
}
