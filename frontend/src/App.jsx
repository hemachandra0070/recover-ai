import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import PaymentDetail from './pages/PaymentDetail';
import AgentActivity from './pages/AgentActivity';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <div className="content-area">
          <TopBar />
          <div className="page-scroll">
            <div className="page-body">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/payments/:id" element={<PaymentDetail />} />
                <Route path="/agent" element={<AgentActivity />} />
                <Route path="*" element={<Dashboard />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
