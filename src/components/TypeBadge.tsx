import type { TypeName } from "@/engine";
import { TYPE_COLORS, TYPE_DARK_TEXT } from "@/lib/typeColors";

export function TypeBadge({ type, small = false }: { type: TypeName; small?: boolean }) {
  return (
    <span
      className={`font-pixel inline-block rounded-sm uppercase leading-none ${small ? "px-[3px] py-[3px] text-[6px]" : "px-1.5 py-1 text-[8px]"}`}
      style={{ background: TYPE_COLORS[type], color: TYPE_DARK_TEXT.has(type) ? "#1d1d1d" : "#fff" }}
    >
      {type}
    </span>
  );
}
