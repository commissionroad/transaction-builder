import { useParams } from "@tanstack/react-router";
import { ActionPage } from "./ActionPage";

export function ActionRoute() {
  const { slug } = useParams({ strict: false }) as { slug: string };

  return <ActionPage slug={slug} />;
}
