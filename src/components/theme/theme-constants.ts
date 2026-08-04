export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "armanhaml-theme";
export const DEFAULT_THEME: Theme = "light";

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "dark" || stored === "light" ? stored : "${DEFAULT_THEME}";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "${DEFAULT_THEME}");
  }
})();
`;
