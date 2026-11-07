import { Routes, Route } from "react-router-dom";
import HomeScreen from "./pages/HomePage";
import DataScreen from "./pages/DataPage";
import PosScreen from "./pages/POSPage";
import HealthCare from "./pages/HealthcarePage";
import TournamentPage from "./pages/TournamentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/data" element={<DataScreen />} />
      <Route path="/pos" element={<PosScreen />} />
      <Route path="/healthcare" element={<HealthCare />} />
      <Route path="/tournament" element={<TournamentPage />} />
    </Routes>
  );
}
