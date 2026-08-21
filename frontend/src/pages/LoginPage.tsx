import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { AuthForm } from "../components/AuthForm";
import { StatusNotice } from "../components/StatusNotice";

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="hidden lg:flex flex-col justify-between px-12 py-12">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <span className="text-on-dark text-lg font-semibold tracking-widest uppercase font-mono">
            Warrant
          </span>
        </div>
        <div>
          <p className="text-on-dark text-2xl font-medium leading-snug max-w-md">
            Borrow access, not own access.
          </p>
          <p className="mt-4 text-on-dark-muted text-sm max-w-sm">
            Every permission expires by default. See exactly why anyone has
            access to anything, always.
          </p>
        </div>
        <p className="text-on-dark-muted text-xs font-mono">
          Time-bound access control
        </p>
      </div>

      <div className="flex items-center justify-center bg-surface-raised px-6 py-12">
        <div className="w-full max-w-sm">
          <StatusNotice />
          <AuthForm mode="login" onSuccess={() => navigate("/")} />
          <p className="mt-6 text-center text-sm text-on-dark-muted">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-on-dark-muted hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
