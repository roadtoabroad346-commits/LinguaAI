import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG, getExercise, listValidatedExercises } from "@/lib/exercises/catalog";
import { normalizeExerciseText, scoreExercise, toPublicExercise, validateExerciseCatalog } from "@/lib/exercises/engine";

describe("universal exercise engine", () => {
  it("validates stable ids, versions, answer keys and productive rubrics", () => {
    expect(validateExerciseCatalog(EXERCISE_CATALOG)).toEqual([]);
  });

  it("normalizes punctuation, case and whitespace without fuzzy guessing", () => {
    expect(normalizeExerciseText("  I SAW her yesterday! ")).toBe("i saw her yesterday");
  });

  it("scores choice, multiple select, matching, ordering and text answers", () => {
    expect(scoreExercise(getExercise("articles-specific-reference")!, "the").correct).toBe(true);
    expect(scoreExercise(getExercise("workplace-collocations-select")!, ["homework", "deadline", "decision"]).correct).toBe(true);
    expect(scoreExercise(getExercise("travel-essential-matching")!, {
      ticket: "proof that you paid for a journey",
      platform: "place where you wait for a train",
      luggage: "bags you take on a journey",
    }).correct).toBe(true);
    expect(scoreExercise(getExercise("directions-sentence-order")!, ["turn", "left", "at", "the", "bank"]).correct).toBe(true);
    expect(scoreExercise(getExercise("present-perfect-error")!, "I saw her yesterday.").correct).toBe(true);
  });

  it("does not invent scores for writing, voice or pronunciation", () => {
    const grade = scoreExercise(getExercise("formal-summary-writing")!, "A learner response");
    expect(grade).toMatchObject({ score: null, correct: null, needsReview: true });
  });

  it("never sends answer keys or hidden audio transcripts to the client", () => {
    const publicExercise = toPublicExercise(getExercise("station-announcement-detail")!);
    expect(publicExercise.hasReferenceAudio).toBe(true);
    expect(publicExercise).not.toHaveProperty("audioText");
    expect(publicExercise).not.toHaveProperty("correctChoiceIds");
  });

  it("keeps pilot C2 work out of validated pathway lists", () => {
    expect(listValidatedExercises({ level: "C2" })).toEqual([]);
    expect(EXERCISE_CATALOG.some((exercise) => exercise.level === "C2" && exercise.validationStatus === "pilot")).toBe(true);
  });
});
