import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import HealthAssessmentForm from './components/HealthAssessmentForm';
import HealthAnalytics from './components/HealthAnalytics';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('landing'); // landing, assessment, login, register

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">กำลังโหลด...</div>
      </div>
    );
  }

  // If authenticated, show dashboard
  if (isAuthenticated) {
    return <Dashboard />;
  }

  // Landing page for public access
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onStartAssessment={() => setCurrentView('assessment')}
        onLogin={() => setCurrentView('login')}
        onRegister={() => setCurrentView('register')}
      />
    );
  }

  // Health assessment form
  if (currentView === 'assessment') {
    return (
      <HealthAssessmentForm 
        onBack={() => setCurrentView('landing')}
        onComplete={() => setCurrentView('login')}
      />
    );
  }

  // Authentication views
  if (currentView === 'register') {
    return (
      <Register 
        onSwitchToLogin={() => setCurrentView('login')} 
        onBackToLanding={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <Login 
      onSwitchToRegister={() => setCurrentView('register')}
      onBackToLanding={() => setCurrentView('landing')}
    />
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
