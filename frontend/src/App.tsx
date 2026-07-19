import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Shield } from "lucide-react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResourceDetailPage from "./pages/ResourceDetailPage";
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
        path="/resources/:id"
        element={
          <ProtectedRoute>
            <ResourceDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
};

export default App;
