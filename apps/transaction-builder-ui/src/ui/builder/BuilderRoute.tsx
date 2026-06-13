import { BuilderView } from "./BuilderView";
import { BuilderWizardPrototype } from "./BuilderWizardPrototype";

export function BuilderRoute() {
  if (shouldShowWizardPrototype()) {
    return <BuilderWizardPrototype />;
  }

  return <BuilderView />;
}

function shouldShowWizardPrototype(): boolean {
  if (import.meta.env.PROD || typeof window === "undefined") {
    return false;
  }

  return (
    new URLSearchParams(window.location.search).get("prototype") === "wizard"
  );
}
