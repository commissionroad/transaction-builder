import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import classNames from "classnames";
import { getPublishedAction } from "src/network/apiClient";
import { ConnectButton } from "../account/ConnectButton/ConnectButton";

const COMMISSIONROAD_URL = "https://commissionroad.xyz";
const DOCS_URL = "https://docs.commissionroad.xyz";

export function Header() {
  const location = useLocation();
  const currentPath = location.pathname;
  const isBuildActive = currentPath === "/";
  const isActionPage = currentPath.startsWith("/t/");
  const actionSlug = isActionPage
    ? currentPath.replace(/^\/t\//, "").split("/")[0]
    : undefined;
  const actionQuery = useQuery({
    queryKey: ["published-action", actionSlug],
    queryFn: () => getPublishedAction(actionSlug ?? ""),
    enabled: Boolean(actionSlug),
    retry: false,
  });
  const actionChainId = actionQuery.data?.definition.chainId;

  if (isActionPage) {
    return (
      <header className="border-b border-base-300 bg-white">
        <div className="mx-auto grid min-h-16 w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4">
          <div />
          <a
            className="inline-flex items-center gap-2 text-lg font-semibold text-neutral"
            href={COMMISSIONROAD_URL}
          >
            <img
              alt="CommissionRoad"
              className="h-7"
              src="/commissionRoadLogo.svg"
            />
            <span className="whitespace-nowrap">CommissionRoad</span>
          </a>
          <div className="justify-self-end">
            <ConnectButton requiredChainId={actionChainId ?? null} />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="daisy-navbar mx-auto w-full max-w-7xl px-4">
        <div className="daisy-navbar-start">
          <div className="daisy-dropdown">
            <button
              tabIndex={0}
              className="daisy-btn daisy-btn-ghost lg:hidden"
              type="button"
              aria-label="Open navigation"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h8m-8 6h16"
                />
              </svg>
            </button>
            <ul
              tabIndex={0}
              className="daisy-menu daisy-menu-lg daisy-dropdown-content z-10 mt-3 w-60 rounded-box bg-base-100 p-2 shadow-sm"
            >
              <li>
                <a
                  href={`${COMMISSIONROAD_URL}/mint`}
                  className="inline-block w-16 text-center"
                >
                  Mint
                </a>
              </li>
              <li>
                <a
                  href={`${COMMISSIONROAD_URL}/portfolio`}
                  className="inline-block w-28 text-center"
                >
                  Portfolio
                </a>
              </li>
              <li>
                <Link
                  to="/"
                  className={classNames(
                    "inline-block w-20 text-center",
                    isBuildActive &&
                      "font-semibold underline underline-offset-6",
                  )}
                >
                  Build
                </Link>
              </li>
              <li>
                <a
                  href={`${COMMISSIONROAD_URL}/demo`}
                  className="inline-block w-24 text-center"
                >
                  Example
                </a>
              </li>
              <li>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Docs
                </a>
              </li>
            </ul>
          </div>
          <a
            className="daisy-btn daisy-btn-ghost text-xl"
            href={COMMISSIONROAD_URL}
          >
            <img
              src="/commissionRoadLogo.svg"
              className="inline h-7"
              alt="CommissionRoad"
            />
            <span className="hidden sm:inline">CommissionRoad</span>
          </a>
        </div>
        <nav className="daisy-navbar-center hidden lg:flex">
          <ul className="daisy-menu daisy-menu-horizontal daisy-menu-lg px-1">
            <li>
              <a
                href={`${COMMISSIONROAD_URL}/mint`}
                className="inline-block w-18 text-center"
              >
                Mint
              </a>
            </li>
            <li>
              <a
                href={`${COMMISSIONROAD_URL}/portfolio`}
                className="inline-block w-28 text-center"
              >
                Portfolio
              </a>
            </li>
            <li>
              <Link
                to="/"
                className={classNames(
                  "inline-block w-20 text-center",
                  isBuildActive && "font-semibold underline underline-offset-6",
                )}
              >
                Build
              </Link>
            </li>
            <li>
              <a
                href={`${COMMISSIONROAD_URL}/demo`}
                className="inline-block w-24 text-center"
              >
                Example
              </a>
            </li>
            <li>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                Docs
              </a>
            </li>
          </ul>
        </nav>
        <div className="daisy-navbar-end">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
