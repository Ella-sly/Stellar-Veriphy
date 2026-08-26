import { ImageResponse } from "next/og";
import { SocialImage, SOCIAL_IMAGE_SIZE } from "@/lib/og/socialImage";

export const alt = "StellarVeriphy — Decentralized Content Verification";
export const size = SOCIAL_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(<SocialImage />, size);
}
