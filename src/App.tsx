import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import BillingRules from '@/pages/BillingRules';
import Bills from '@/pages/Bills';
import Batches from '@/pages/Batches';
import StockOut from '@/pages/StockOut';
import Maintenance from '@/pages/Maintenance';
import MonthEnd from '@/pages/MonthEnd';
import Alerts from '@/pages/Alerts';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/billing-rules" element={<BillingRules />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/stock-out" element={<StockOut />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/month-end" element={<MonthEnd />} />
          <Route path="/alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </Router>
  );
}
