import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Shield } from "lucide-react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResourceDetailPage from "./pages/ResourceDetailPage";
import ResourcesPage from "./pages/ResourcesPage";
import MyAccessPage from "./pages/MyAccessPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import AuditLogPage from "./pages/AuditLogPage";
import AdminPage from "./pages/AdminPage";
import type { ReactNode } from "react";

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-bg gap-4">
    <div className="relative flex items-center justify-center">
      <div className="h-12 w-12 rounded-full border-2 border-border-dark border-t-brand animate-spin" />
      <Shield className="absolute h-5 w-5 text-brand" />
    </div>
    <p className="text-xs font-mono uppercase tracking-widest text-on-dark-muted">
      Verifying session...
    </p>
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, sessionLoading } = useAuth();

  if (sessionLoading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, sessionLoading } = useAuth();

  if (sessionLoading) {
    return <LoadingScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <ResourcesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id"
        element={
          <ProtectedRoute>
            <ResourceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-access"
        element={
          <ProtectedRoute>
            <MyAccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <ApprovalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups"
        element={
          <ProtectedRoute>
            <GroupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:id"
        element={
          <ProtectedRoute>
            <GroupDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen bg-bg">
          <AppRoutes />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
