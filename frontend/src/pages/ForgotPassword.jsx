import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-8"><M2MLogo /></Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-6">
                If an account with <strong>{email}</strong> exists, we've sent a password reset link. Please check your inbox and follow the instructions.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-mustard-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-mustard-200">
                  <Mail className="w-8 h-8 text-mustard-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-sm text-gray-500">Enter your email and we'll send you a link to reset your password.</p>
              </div>

              {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-gray-400" /></div>
                    <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Remember your password? <Link to="/login" className="text-navy-700 font-semibold hover:underline">Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
