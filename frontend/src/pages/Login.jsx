import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Mail, Lock, Phone, AlertCircle } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8080';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  const redirectTo = location.state?.from || null;
  const [role, setRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const identifier = loginMethod === 'email' ? email : phone;

    if (!identifier || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const body = loginMethod === 'email'
        ? { email: identifier, password }
        : { phone: identifier, password };

      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid credentials. Please register first.');
        setLoading(false);
        return;
      }

      // Store via AuthContext (sets localStorage + state)
      authLogin(data.data);

      // Navigate based on actual role from backend, or to the page they were trying to access
      const userRole = data.data.role.toLowerCase();
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate(userRole === 'farmer' ? '/farmer' : '/business', { replace: true });
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 8080.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center mb-8">
          <M2MLogo />
        </Link>

        {!role ? (
          <>
            <div className="text-center mb-10">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Welcome to Mitti2Market</h1>
              <p className="text-lg text-gray-500">How are you using the platform?</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Farmer Card */}
              <button
                onClick={() => setRole('farmer')}
                className="group bg-white rounded-3xl p-8 border-2 border-navy-100 shadow-sm hover:border-mustard-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-16 h-16 bg-mustard-50 rounded-2xl flex items-center justify-center text-4xl mb-5 group-hover:bg-mustard-100 border border-mustard-200 transition">
                  👨‍🌾
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Farmer</h2>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  Sell your produce directly to verified buyers.
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-navy-800 group-hover:text-navy-900">
                  Continue as Farmer
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Business Card */}
              <button
                onClick={() => setRole('business')}
                className="group bg-white rounded-3xl p-8 border-2 border-navy-100 shadow-sm hover:border-mustard-400 hover:shadow-lg transition-all text-left"
              >
                <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center text-4xl mb-5 group-hover:bg-navy-100 border border-navy-200 transition">
                  🏪
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Business</h2>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  Source fresh produce directly from farmers and FPOs.
                </p>
                <div className="flex items-center gap-2 text-sm font-semibold text-navy-800 group-hover:text-navy-900">
                  Continue as Business
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-mustard-50 rounded-full text-sm font-medium text-navy-800 border border-mustard-200 mb-4">
                {role === 'farmer' ? '👨‍🌾' : '🏪'} {role === 'farmer' ? 'Farmer' : 'Business'} Account
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
              <p className="text-gray-500">Enter your credentials to continue</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                {/* Login method toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                  <button
                    onClick={() => { setLoginMethod('email'); setError(''); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                      loginMethod === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    onClick={() => { setLoginMethod('phone'); setError(''); }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                      loginMethod === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    Mobile
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {loginMethod === 'phone' ? 'Mobile Number' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        {loginMethod === 'phone' ? (
                          <Phone className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Mail className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type={loginMethod === 'phone' ? 'tel' : 'email'}
                        placeholder={loginMethod === 'phone' ? '+91 98765 43210' : 'you@example.com'}
                        value={loginMethod === 'email' ? email : phone}
                        onChange={(e) => loginMethod === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-navy-700 font-semibold hover:underline">
                      Create account
                    </Link>
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setRole(null); setError(''); setEmail(''); setPassword(''); }}
                className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                ← Choose a different role
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
