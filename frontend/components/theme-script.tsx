import Script from "next/script";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("anonspace-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- App Router root layout is the documented location for beforeInteractive scripts
    <Script
      id="anonspace-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
