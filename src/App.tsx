import { Route, Routes } from "react-router-dom";
import AdminPanel from "./admin/AdminPanel";

function StoreFront() {
  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, overflow: "hidden" }}>
      <iframe
        src="/design-baseline.html"
        title="Shakra Perfume"
        style={{ width: "100%", height: "100%", border: "0", display: "block" }}
      />
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPanel />} />
      <Route path="*" element={<StoreFront />} />
    </Routes>
  );
}
