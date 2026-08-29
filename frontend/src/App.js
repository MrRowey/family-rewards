import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import ParentPanel from './pages/ParentPanel';
import Shop from './pages/Shop';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/shop/:childId" element={<Shop />} />
          <Route path="/parent/*" element={<ParentPanel />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
