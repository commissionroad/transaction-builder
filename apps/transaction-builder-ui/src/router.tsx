import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { ActionRoute } from "./ui/action/ActionRoute";
import { BuilderRoute } from "./ui/builder/BuilderRoute";
import { Header } from "./ui/navigation/Header";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-base-200 text-neutral">
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
  component: ActionRoute,
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
