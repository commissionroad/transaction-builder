import { lightTheme, type Theme } from "@rainbow-me/rainbowkit";

export const commissionRoadTheme = {
  ...lightTheme(),
  colors: {
    ...lightTheme().colors,
    accentColor: "var(--color-primary)",
    accentColorForeground: "var(--color-primary-content)",
    error: "var(--color-error)",
    modalBackground: "var(--color-base-100)",
    modalText: "var(--color-neutral)",
  },
  fonts: {
    body: '"Ubuntu", sans-serif',
  },
  radii: {
    ...lightTheme().radii,
    actionButton: "var(--radius-field)",
    connectButton: "var(--radius-field)",
    menuButton: "var(--radius-field)",
    modal: "var(--radius-box)",
    modalMobile: "var(--radius-box)",
  },
} satisfies Theme;
