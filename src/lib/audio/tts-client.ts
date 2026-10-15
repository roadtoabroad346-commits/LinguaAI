import { getPlaybackSpeed } from "@/lib/audio/speed";

export type ReferenceAudioSource =
  | { kind: "listening"; slug: string; segment?: "full" | "line"; index?: number }
  | { kind: "pronunciation"; slug: string; segment?: "line" | "example"; index?: number }
  | { kind: "exercise"; slug: string };

let activeAudio: HTMLAudioElement | null = null;
const objectUrls = new Map<string, string>();

function sourceUrl(source: ReferenceAudioSource): string {
  const params = new URLSearchParams({ kind: source.kind, slug: source.slug });
  if ("segment" in source && source.segment) params.set("segment", source.segment);
  if ("index" in source && source.index !== undefined) params.set("index", String(source.index));
  return `/api/audio/tts?${params}`;
}

export async function playReferenceAudio(source: ReferenceAudioSource, rate: number = getPlaybackSpeed()): Promise<void> {
  stopReferenceAudio();
  const requestUrl = sourceUrl(source);
  let objectUrl = objectUrls.get(requestUrl);
  if (!objectUrl) {
    const response = await fetch(requestUrl);
    if (!response.ok) throw new Error("Reference audio is unavailable.");
    objectUrl = URL.createObjectURL(await response.blob());
    if (objectUrls.size >= 24) {
      const oldest = objectUrls.keys().next().value;
      if (oldest) {
        URL.revokeObjectURL(objectUrls.get(oldest)!);
        objectUrls.delete(oldest);
      }
    }
    objectUrls.set(requestUrl, objectUrl);
  }
  const audio = new Audio(objectUrl);
  audio.playbackRate = rate;
  activeAudio = audio;
  audio.addEventListener("ended", () => { if (activeAudio === audio) activeAudio = null; }, { once: true });
  await audio.play();
}

export function stopReferenceAudio(): void {
  activeAudio?.pause();
  if (activeAudio) activeAudio.currentTime = 0;
  activeAudio = null;
}
