import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { DemoBar } from './components/DemoBar.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { CitizenPortal } from './pages/CitizenPortal.tsx';
import { CounsellorQueue } from './pages/CounsellorQueue.tsx';
import { CaseDetail } from './pages/CaseDetail.tsx';
import { DistrictStateDashboard } from './pages/DistrictStateDashboard.tsx';
import { CheckInPage } from './pages/CheckInPage.tsx';
import { OutboxSimulator } from './pages/OutboxSimulator.tsx';
import { AdminSettings } from './pages/AdminSettings.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { getStoredUser, clearStoredAuth } from './services/api.ts';
import { User } from './types/index.ts';

function AppContent() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    navigate('/');
  };

  const handleScenarioLoad = (scenarioId: number) => {
    if (scenarioId === 1) {
      // Scenario 1: Low-risk inquiry
      navigate('/portal?channel=chat');
    } else if (scenarioId === 2) {
      // Scenario 2: Moderate distress
      navigate('/cases/case_1003');
    } else if (scenarioId === 3) {
      // Scenario 3: Critical self-harm flag
      navigate('/cases/case_1001');
    } else if (scenarioId === 4) {
      // Scenario 4: Worsening case over 30 days
      navigate('/cases/case_1002');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* SIH 2026 Evaluator Demo Bar */}
      <DemoBar 
        currentUser={currentUser}
        onUserSwitch={(user) => {
          setCurrentUser(user);
          if (user.role === 'counsellor') navigate('/queue');
          else if (user.role === 'district_admin' || user.role === 'state_admin') navigate('/analytics');
          else navigate('/portal');
        }}
        onScenarioLoad={handleScenarioLoad}
        onTimeTraveled={() => {
          // If on queue or dashboard, refresh
        }}
      />

      {/* Main Top Header Navbar */}
      <Navbar 
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onLogout={handleLogout}
      />

      {/* Page Routing */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/portal" element={<CitizenPortal />} />
          <Route path="/queue" element={<CounsellorQueue />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/analytics" element={<DistrictStateDashboard currentUser={currentUser} />} />
          <Route path="/checkin/:token" element={<CheckInPage />} />
          <Route path="/outbox" element={<OutboxSimulator />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/login" element={<LoginPage onLoginSuccess={setCurrentUser} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
