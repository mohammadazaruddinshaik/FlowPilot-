import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components

import Sidebar from './components/Sidebar';
import Header from './components/Header'; 
// Pages

import Login from './pages/Login';
import DashboardLayout from './pages/Dashboard';
import TemplatesList from './pages/TemplatesList'; 
import CreateTemplate from './pages/CreateTemplate'; 
import DatasetsList from './pages/DataList'; 
import IntegrationsList from './pages/IntegrationList';
import Execution from './pages/Execution';
import LandingPage from './pages/Landing';
import Analytics from './pages/Analytics';
import TemplateDetail from './pages/TemplateDetails';

import ExecutionHistory from './pages/ExecutionHistory';
import ExecutionDetail from './pages/ExecutionDetail';

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-[#111827] overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header /> 
        
        <main className="flex-1 overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (

    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardLayout />} />
           
            <Route path="/templates" element={<TemplatesList />} />            
            <Route path="/templates/create" element={<CreateTemplate />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />
            <Route path="/datasets" element={<DatasetsList />} />

            <Route path="/executions" element={<ExecutionHistory />} />
            <Route path="/executions/new" element={<Execution />} />
            <Route path="/executions/:id" element={<ExecutionDetail />} />

            <Route path="/integrations" element={<IntegrationsList />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}