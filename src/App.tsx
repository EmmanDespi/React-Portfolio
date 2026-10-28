import { Routes, Route } from "react-router-dom";
import HomeScreen from "./pages/HomePage";
import DataScreen from "./pages/DataPage";
import PosScreen from "./pages/POSPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/data" element={<DataScreen />} />
      <Route path="/pos" element={<PosScreen />} />
    </Routes>
  );
}
