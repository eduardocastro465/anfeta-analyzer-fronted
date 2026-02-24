import { createContext, useContext } from "react";

const ThemeContext = createContext<"light" | "dark">("dark");

export const ChatThemeProvider = ThemeContext.Provider;

export function useTheme() {
  return useContext(ThemeContext);
}