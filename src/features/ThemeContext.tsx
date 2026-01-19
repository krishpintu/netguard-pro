// ThemeContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type ThemeContextType = {
  bgColor: string;
  textColor: string;
  headerBgColor: string;
  navHeaderBgColor: string;
  setBgColor: (color: string) => void;
  setTextColor: (color: string) => void;
  setHeaderBgColor: (color: string) => void;
  setNavHeaderBgColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [bgColor, setBgColor] = useState(
    () => localStorage.getItem("bgColor") || "#1a3d73"
  );
  const [textColor, setTextColor] = useState(
    () => localStorage.getItem("textColor") || "#ffffff"
  );
  const [headerBgColor, setHeaderBgColor] = useState(
    () => localStorage.getItem("headerBgColor") || "#f9fafb"
  );
  const [navHeaderBgColor, setNavHeaderBgColor] = useState(
    () => localStorage.getItem("navHeaderBgColor") || "#f9fafb"
  );

  useEffect(() => {
    localStorage.setItem("bgColor", bgColor);
    localStorage.setItem("textColor", textColor);
    localStorage.setItem("headerBgColor", headerBgColor);
    localStorage.setItem("navHeaderBgColor", navHeaderBgColor);
  }, [bgColor, textColor, headerBgColor, navHeaderBgColor]);

  return (
    <ThemeContext.Provider
      value={{
        bgColor,
        textColor,
        headerBgColor,
        navHeaderBgColor,
        setBgColor,
        setTextColor,
        setHeaderBgColor,
        setNavHeaderBgColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
