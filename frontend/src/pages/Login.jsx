import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, User, LogIn, UserPlus, GraduationCap, AlertCircle } from "lucide-react";
import Card from "../components/Card";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Handle Google Callback token
  const handleGoogleCallback = async (response) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Sign-In button
  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "528720132973-hgnddss3r7rql5ull544sf94av1k73c2.apps.googleusercontent.com",
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          {
            theme: "filled_blue",
            size: "large",
            width: "320",
            text: "continue_with",
            shape: "rectangular"
          }
        );
      }
    };

    initGoogle();

    const checkInterval = setInterval(() => {
      if (window.google) {
        initGoogle();
        clearInterval(checkInterval);
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-primary-600/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-accent-500/10 blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Brand logo header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-accent-500" size={36} />
            <span className="text-3xl font-extrabold text-white">
              Campus<span className="text-accent-500">Flow</span>
            </span>
          </div>
          <p className="text-gray-400 text-sm">Your intelligent campus hub & schedule coordinator</p>
        </div>

        {/* Auth Glass Card */}
        <Card className="bg-gray-900/60 border border-gray-800/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl relative">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {isSignUp ? (
              <>
                <UserPlus size={20} className="text-accent-500" />
                Create student account
              </>
            ) : (
              <>
                <LogIn size={20} className="text-primary-500" />
                Sign in to your panel
              </>
            )}
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-950/45 border border-red-500/20 text-red-300 p-3.5 rounded-lg text-xs animate-shake">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-gray-500" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-950/50 border border-gray-800 focus:border-accent-500 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input
                  required
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950/50 border border-gray-800 focus:border-primary-500 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-950/50 border border-gray-800 focus:border-primary-500 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold text-white shadow-lg transition-all ${
                isSignUp
                  ? "bg-accent-500 hover:bg-accent-600 shadow-accent-500/10"
                  : "bg-primary-600 hover:bg-primary-700 shadow-primary-600/10"
              } disabled:opacity-50`}
            >
              {loading ? "Processing…" : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Social login divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800/80"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900/60 px-2 text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google SSO Center */}
          <div className="flex justify-center">
            <div id="google-signin-button" className="min-h-[44px]"></div>
          </div>

          {/* Card footer toggle */}
          <div className="mt-6 text-center text-xs">
            <button
              onClick={() => {
                setIsSignUp((prev) => !prev);
                setError("");
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <span className="text-primary-400 font-semibold hover:underline">Sign In instead</span>
                </>
              ) : (
                <>
                  New to Campus Flow?{" "}
                  <span className="text-accent-400 font-semibold hover:underline">Create an account</span>
                </>
              )}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
