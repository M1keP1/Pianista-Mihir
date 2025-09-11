// App.tsx
import { ThemeProvider } from "./themeContext";
import Backdrop from "./BackDrop";              
import ThemeSwitcherFab from "./components/themeSwitcher";
import "./theme.css";                           

export default function App() {
  return (
    <ThemeProvider>
      <Backdrop />
      <ThemeSwitcherFab />
    </ThemeProvider>
  );
}
