const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("anonspace-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return (
    <script
      id="anonspace-theme-init"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  );
}
