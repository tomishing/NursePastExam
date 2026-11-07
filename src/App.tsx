import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout.tsx";
import Home from "./pages/Home.tsx";
import Review from "./pages/Review.tsx";
import Browse from "./pages/Browse.tsx";
import Stats from "./pages/Stats.tsx";
import Settings from "./pages/Settings.tsx";

// The router itself is provided by main.tsx (BrowserRouter) or by tests (MemoryRouter).
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="review" element={<Review />} />
        <Route path="browse" element={<Browse />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
