import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { BuilderRoute } from "./ui/builder/BuilderRoute";
import { Header } from "./ui/navigation/Header";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-base-100 text-neutral">
      <Header />
      <Outlet />
    </div>
  ),
});

const builderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: BuilderRoute,
});

const actionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/t/$slug",
  component: () => (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">Action Page</h1>
      <p className="max-w-2xl text-base-content/70">
        Published Action execution pages land here in the next slice.
      </p>
    </main>
  ),
});

export const routeTree = rootRoute.addChildren([builderRoute, actionRoute]);

export function createAppRouter() {
  return createRouter({ routeTree });
}

export const router = createAppRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
