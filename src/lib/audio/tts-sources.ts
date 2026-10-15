import { getExercise } from "@/lib/exercises/catalog";
import { getListeningTrack, trackSpeakText } from "@/lib/listening/library";
import { getPronunciationDrill } from "@/lib/pronunciation/drills";

export interface ResolvedTtsSource { text: string; style: string; sourceId: string; }

export function resolveTtsSource(params: URLSearchParams): ResolvedTtsSource | null {
  const kind = params.get("kind");
  const slug = params.get("slug")?.trim().toLowerCase() ?? "";
  const segment = params.get("segment") ?? "full";
  const index = Number(params.get("index") ?? "0");
  if (!Number.isInteger(index) || index < 0 || index > 100) return null;

  if (kind === "listening") {
    const track = getListeningTrack(slug);
    if (!track) return null;
    const text = segment === "full" ? trackSpeakText(track) : track.lines[index]?.text;
    if (!text) return null;
    return { text, style: track.kind === "dialogue" ? "Clear conversational English with natural phrasing." : "Clear educational English at a natural pace.", sourceId: `listening:${slug}:${segment}:${index}` };
  }
  if (kind === "pronunciation") {
    const drill = getPronunciationDrill(slug);
    if (!drill) return null;
    const text = segment === "example" ? drill.examples[index] : drill.practiceLines[index];
    if (!text) return null;
    return { text, style: `Careful English pronunciation model. Emphasize this focus: ${drill.focus}`, sourceId: `pronunciation:${slug}:${segment}:${index}` };
  }
  if (kind === "exercise") {
    const exercise = getExercise(slug);
    if (!exercise?.audioText || exercise.validationStatus !== "validated") return null;
    return { text: exercise.audioText, style: "Clear English learning reference audio with precise articulation.", sourceId: `exercise:${slug}` };
  }
  return null;
}
