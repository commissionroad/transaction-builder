import { Link, useLocation } from "@tanstack/react-router";
import classNames from "classnames";
import { ExternalLink, Menu } from "lucide-react";
import { ConnectButton } from "../account/ConnectButton/ConnectButton";

export function Header() {
  const location = useLocation();
  const isBuildActive = location.pathname === "/";

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
              <Menu className="size-5" />
            </button>
            <ul
              tabIndex={0}
              className="daisy-menu daisy-menu-lg daisy-dropdown-content z-10 mt-3 w-60 rounded-box bg-base-100 p-2 shadow-sm"
            >
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
                  href="https://docs.commissionroad.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Docs
                  <ExternalLink className="size-4" />
                </a>
              </li>
            </ul>
          </div>
          <Link className="daisy-btn daisy-btn-ghost text-xl" to="/">
            <img
              src="/commissionRoadLogo.svg"
              className="inline h-7"
              alt="CommissionRoad"
            />
            <span className="hidden sm:inline">CommissionRoad</span>
          </Link>
        </div>
        <nav className="daisy-navbar-center hidden lg:flex">
          <ul className="daisy-menu daisy-menu-horizontal daisy-menu-lg px-1">
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
                href="https://docs.commissionroad.xyz"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2"
              >
                Docs
                <ExternalLink className="size-4" />
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
