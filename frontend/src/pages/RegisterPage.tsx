import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { AuthForm } from "../components/AuthForm";

const RegisterPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="hidden lg:flex flex-col justify-between bg-bg px-12 py-12">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <span className="text-on-dark text-lg font-semibold tracking-widest uppercase font-mono">
            Warrant
          </span>
        </div>
        <div>
          <p className="text-on-dark text-2xl font-medium leading-snug max-w-md">
            Request access. Get an answer. Know exactly when it ends.
          </p>
          <p className="mt-4 text-on-dark-muted text-sm max-w-sm">
            No standing permissions nobody remembers granting.
          </p>
        </div>
        <p className="text-on-dark-muted text-xs font-mono">
          Time-bound access control
        </p>
      </div>

      <div className="flex items-center justify-center bg-surface-raised px-6 py-12">
        <div className="w-full max-w-sm">
          <AuthForm mode="register" onSuccess={() => navigate("/")} />
          <p className="mt-6 text-center text-sm text-on-dark-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-on-dark-muted hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
