import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import LiveMonitor from './pages/LiveMonitor';
import DetectionLogs from './pages/DetectionLogs';
import RiskAnalysis from './pages/RiskAnalysis';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AcceptInvite from './pages/AcceptInvite';
import ChangePassword from './pages/ChangePassword';
import UserManagement from './pages/UserManagement';
import AIPerformance from './pages/AIPerformance';
import RequireRole from './components/RequireRole';
import { WarehouseProvider } from './context/WarehouseContext';
import { ToastProvider } from './components/ToastNotification';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <WarehouseProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Protected Dashboard Routes */}
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<LiveMonitor />} />
              <Route path="logs" element={<DetectionLogs />} />
              <Route
                path="analysis"
                element={
                  <RequireRole roles={['admin', 'manager']}>
                    <RiskAnalysis />
                  </RequireRole>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireRole roles={['admin', 'manager']}>
                    <Settings />
                  </RequireRole>
                }
              />
              <Route
                path="users"
                element={
                  <RequireRole roles={['admin']}>
                    <UserManagement />
                  </RequireRole>
                }
              />
              <Route
                path="ai-performance"
                element={
                  <RequireRole roles={['admin', 'manager']}>
                    <AIPerformance />
                  </RequireRole>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </WarehouseProvider>
    </ToastProvider>
  );
}

export default App;
