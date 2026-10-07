import { redirect } from "next/navigation";

/** Legacy Guided Path entry now resolves to the adaptive Smart Path. */
export default function GuidedPathPage() {
  redirect("/smart-path");
}
