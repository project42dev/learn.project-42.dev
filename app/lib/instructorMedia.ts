import instructorRenderingConfig from "../../config/instructor-renderings.json";

// Which instructor-led lessons have actually been rendered.
//
// This is deliberately a short, explicit list rather than a glob over
// /public/preview or an assumption that "a class script exists" means "a video
// exists". Forty modules carry a class script and exactly one has been filmed;
// a page that inferred availability from the script would advertise
// thirty-nine lessons nobody can watch.
//
// The platform ships a full VirtualInstructorMediaManifest contract for
// released lessons, which requires a class-script hash, model and voice profile
// refs, pronunciation-review evidence, and a disclosure string. This render has
// none of those yet - the class script itself is still releaseStatus "draft" -
// so claiming that contract here would assert provenance the artifact does not
// have. When a lesson is produced properly, its manifest becomes the source
// this list is generated from.
export interface InstructorRendering {
  moduleId: string;
  pathId: string;
  /** Path under /public. Self-hosted with the site, nothing that expires. */
  src: string;
  /** Seconds of video that exist, which is not the planned lesson length. */
  renderedSeconds: number;
  /** How many of the class script's segments were spoken in this render. */
  renderedSegments: number;
  /** Azure Speech batch avatar character and style. */
  avatar: string;
  /** SSML voice name. Never mai-voice-2: it emits no word timing. */
  voice: string;
  renderedAt: string;
  captions: "embedded" | "sidecar" | "none";
  /**
   * True while the render covers only part of the script. The lesson page has
   * to say so, because a player that stops a minute into an eighteen minute
   * lesson otherwise reads as a broken video rather than a preview.
   */
  partial: boolean;
}

// Held in config/ rather than in this file so the route inventory that drives
// the link check and the GitHub Pages export can read the same list. A
// TypeScript constant would have forced the build scripts to guess which
// lessons exist, and a guess there publishes pages that 404.
export const instructorRenderings: InstructorRendering[] = Object.freeze(
  instructorRenderingConfig.renderings as InstructorRendering[],
) as InstructorRendering[];

export function getInstructorRendering(
  moduleId: string,
): InstructorRendering | undefined {
  return instructorRenderings.find(
    (rendering) => rendering.moduleId === moduleId,
  );
}

export function formatLessonLength(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) return `${totalSeconds} sec`;
  return `${minutes} min`;
}

export function formatSegmentLength(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

// The class script's own vocabulary, spelled for a learner rather than for the
// production pipeline. Every kind in CLASS_SEGMENT_KINDS is covered, so a new
// kind shows up as itself instead of silently rendering blank.
export const SEGMENT_KIND_LABELS: Record<string, string> = {
  welcome: "Welcome",
  narration: "Teaching",
  demonstration: "Demonstration",
  "learner-prompt": "Over to you",
  pause: "Pause",
  checkpoint: "Checkpoint",
  feedback: "Feedback",
  transition: "Transition",
  "assessment-handoff": "Into the knowledge check",
  closing: "Closing",
};
