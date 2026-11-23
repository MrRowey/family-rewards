import { OptionsDescriptor, Style } from "@dicebear/core";
import bottts from "@dicebear/styles/bottts.json";
import botttsNeutral from "@dicebear/styles/bottts-neutral.json";
import critters from "@dicebear/styles/critters.json";
import sprouts from "@dicebear/styles/sprouts.json";
import voxelBot from "@dicebear/styles/voxel-bot.json";
import constellation from "@dicebear/styles/constellation.json";
import planets from "@dicebear/styles/planets.json";
import adventurer from "@dicebear/styles/adventurer.json";
import funEmoji from "@dicebear/styles/fun-emoji.json";

export const AVATAR_STYLES = { bottts, botttsNeutral, critters, sprouts, voxelBot, constellation, planets, adventurer, funEmoji };
export type AvatarDescriptor = { type: string; values?: string[]; list?: boolean };
export function avatarOptions(theme: string): Record<string, AvatarDescriptor> {
  const definition = AVATAR_STYLES[theme as keyof typeof AVATAR_STYLES] || AVATAR_STYLES.bottts;
  return new OptionsDescriptor(new Style(definition)).toJSON() as Record<string, AvatarDescriptor>;
}
export const AVATAR_VARIANT_PRICE = 10;
export function variantIsFree(theme: string, component: string, variant: string): boolean {
  const option = avatarOptions(theme)[component];
  return option?.type === "enum" && component.endsWith("Variant") && option.values?.[0] === variant;
}
export function variantExists(theme: string, component: string, variant: string): boolean {
  const option = avatarOptions(theme)[component];
  return option?.type === "enum" && component.endsWith("Variant") && Boolean(option.values?.includes(variant));
}
