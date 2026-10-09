import { spriteUrl } from "@/data/dex";

/** Pixel sprite scaled by an integer factor (Showdown gen5 sprites fit in 96×96). */
export function Sprite({
  speciesId,
  shiny = false,
  scale = 1,
  flip = false,
  className = "",
  alt = "",
}: {
  speciesId: number;
  shiny?: boolean;
  scale?: 1 | 2 | 3;
  flip?: boolean;
  className?: string;
  alt?: string;
}) {
  const box = 96 * scale;
  return (
    <div className={`flex items-end justify-center ${className}`} style={{ width: box, height: box }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel GIFs must not be re-encoded */}
      <img
        src={spriteUrl(speciesId, shiny)}
        alt={alt}
        className="pixelated max-w-none"
        style={{ zoom: scale, transform: flip ? "scaleX(-1)" : undefined }}
        draggable={false}
      />
    </div>
  );
}
