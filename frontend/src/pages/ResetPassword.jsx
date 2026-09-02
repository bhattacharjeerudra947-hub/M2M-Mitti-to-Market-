import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { resetPassword } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) { setError('Invalid or missing reset token. Please request a new reset link.'); return; }
    if (!password) { setError('Please enter a new password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.ok) {
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } else {
      setError(result.error || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8"><Link to="/" className="inline-flex items-center"><M2MLogo /></Link></div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
              <p className="text-sm text-gray-500 mb-4">Your password has been updated successfully. Redirecting to sign in...</p>
              <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
                <ArrowLeft className="w-4 h-4" /> Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition"><ArrowLeft className="w-4 h-4" /> Back to Sign In</Link>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-mustard-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-mustard-200">
                  <Lock className="w-8 h-8 text-mustard-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
                <p className="text-sm text-gray-500">Enter your new password below.</p>
              </div>

              {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></div>
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="At least 6 characters" className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">{showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></div>
                    <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} placeholder="Re-enter password" className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
