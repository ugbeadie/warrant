import { useNavigate, Link } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="hidden lg:flex flex-col justify-between bg-surface-raised px-12 py-12">
        <div>
          <span className="text-white text-lg uppercase font-semibold tracking-tight font-mono">
            Warrant
          </span>
        </div>
        <div>
          <p className="text-on-dark text-2xl font-medium leading-snug max-w-md font-sans">
            Borrow access, not own access.
          </p>
          <p className="mt-4 text-muted text-sm max-w-sm font-sans">
            Every permission expires by default. See exactly why anyone has
            access to anything, always.
          </p>
        </div>
        <p className="text-muted text-xs font-mono">
          Time-bound access control
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <AuthForm mode="login" onSuccess={() => navigate("/")} />
          <p className="mt-6 text-center text-sm text-secondary font-sans">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
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
