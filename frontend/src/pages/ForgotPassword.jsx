import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { sendOtp, verifyOtp, resetPasswordWithOtp } from '../services/api';

const STEPS = {
  IDENTIFIER: 'identifier',
  OTP: 'otp',
  NEW_PASSWORD: 'new_password',
};

export default function ForgotPassword() {
  const navigate = useNavigate();

  // Step management
  const [step, setStep] = useState(STEPS.IDENTIFIER);
  const [identifier, setIdentifier] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [channel, setChannel] = useState('');

  // OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  // New password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // ─── Step 1: Send OTP ───
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    const result = await sendOtp(identifier.trim());
    setLoading(false);

    if (result.ok) {
      setMaskedContact(result.data.maskedContact || '');
      setChannel(result.data.channel || 'EMAIL');
      setStep(STEPS.OTP);
      setResendTimer(60);
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(result.error || 'Failed to send OTP. Please try again.');
    }
  };

  // ─── Step 2: Verify OTP ───
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    const result = await verifyOtp(identifier.trim(), otpString);
    setLoading(false);

    if (result.ok) {
      setStep(STEPS.NEW_PASSWORD);
    } else {
      setError(result.error || 'Invalid OTP. Please try again.');
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // ─── Step 3: Reset Password ───
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) { setError('Please enter a new password'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const result = await resetPasswordWithOtp(identifier.trim(), otp.join(''), newPassword);
    setLoading(false);

    if (result.ok) {
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } else {
      setError(result.error || 'Failed to reset password. Please try again.');
    }
  };

  // ─── Resend OTP ───
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setLoading(true);
    const result = await sendOtp(identifier.trim());
    setLoading(false);

    if (result.ok) {
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      setError(result.error || 'Failed to resend OTP.');
    }
  };

  // ─── OTP input handler ───
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take last digit only
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newOtp = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // ─── Success screen ───
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center mb-8"><M2MLogo /></Link>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been updated successfully. Redirecting to sign in...
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-navy-900 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 transition">
              <ArrowLeft className="w-4 h-4" /> Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center mb-8"><M2MLogo /></Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>

          {/* ─── Step Indicator ─── */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {['1', '2', '3'].map((num, i) => {
              const steps = [STEPS.IDENTIFIER, STEPS.OTP, STEPS.NEW_PASSWORD];
              const currentIndex = steps.indexOf(step);
              const isCompleted = i < currentIndex;
              const isCurrent = i === currentIndex;
              return (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    isCompleted ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-navy-900 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : num}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ═══ Step 1: Enter Email/Phone ═══ */}
          {step === STEPS.IDENTIFIER && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-mustard-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-mustard-200">
                  <KeyRound className="w-8 h-8 text-mustard-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                <p className="text-sm text-gray-500">Enter your email or phone number and we'll send you a verification code.</p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email or Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      {identifier.includes('@') ? <Mail className="w-5 h-5 text-gray-400" /> : <Phone className="w-5 h-5 text-gray-400" />}
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                      placeholder="you@example.com or 9876543210"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...</> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ═══ Step 2: Enter OTP ═══ */}
          {step === STEPS.OTP && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-mustard-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-mustard-200">
                  <span className="text-2xl">🔢</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter OTP</h1>
                <p className="text-sm text-gray-500">
                  We've sent a 6-digit code to <strong>{maskedContact || identifier}</strong>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {/* OTP Input Boxes */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-xl font-bold bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition ${
                        digit ? 'border-navy-300 bg-navy-50' : 'border-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify OTP'}
                </button>

                {/* Resend OTP */}
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-500">Resend OTP in <span className="font-semibold text-navy-700">{resendTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleResendOtp} disabled={loading} className="text-sm text-navy-700 font-semibold hover:underline disabled:opacity-60">
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {/* ═══ Step 3: Set New Password ═══ */}
          {step === STEPS.NEW_PASSWORD && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-mustard-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-mustard-200">
                  <Lock className="w-8 h-8 text-mustard-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Set New Password</h1>
                <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="At least 6 characters"
                      className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Re-enter password"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Remember your password? <Link to="/login" className="text-navy-700 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
