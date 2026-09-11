import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { useAuth } from '../context/AuthContext';

/**
 * Farmer Login Portal — only accepts FARMER accounts.
 * The role is fixed; the user cannot switch to another portal from here.
 */
export default function FarmerLogin() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated as a farmer, go to farmer dashboard.
  useEffect(() => {
    if (isAuthenticated && user) {
      const r = user.role?.toLowerCase();
      if (r === 'farmer') {
        navigate('/farmer', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email or mobile number is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    const result = await login(email.trim(), password, 'farmer');
    setLoading(false);

    if (result.ok) {
      navigate('/farmer', { replace: true });
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center"><M2MLogo /></Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-mustard-50 rounded-full text-sm font-medium text-navy-800 border border-mustard-200 mb-4">
              <span className="text-xl">👨‍🌾</span> Farmer Login Portal
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In — Farmer</h1>
            <p className="text-gray-500">Only Farmer accounts can sign in here</p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address or Mobile Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-gray-400" /></div>
                  <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com or 9876543210"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" className="text-xs text-navy-700 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></div>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/signup" className="text-navy-700 font-semibold hover:underline">Create Account</Link>
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-gray-500">
            <Link to="/business/login" className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">Business/Buyer Login</Link>
            <Link to="/admin/login" className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
