import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Lock, MapPin, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import M2MLogo from '../components/M2MLogo';
import { useAuth } from '../context/AuthContext';

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated, role: userRole } = useAuth();

  const preselectedRole = location.state?.role || '';

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: preselectedRole, location: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate(userRole === 'farmer' ? '/farmer' : '/business', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate]);

  const update = (key, val) => { setForm(f => ({ ...f, [key]: val })); setFieldErrors(e => ({ ...e, [key]: '' })); setError(''); };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!form.role) errs.role = 'Please select a role';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    const result = await register(form.name, form.email, form.phone, form.password, form.role, form.location);
    setLoading(false);
    if (result.ok) {
      navigate(form.role === 'farmer' ? '/farmer' : '/business', { replace: true });
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  const inputClass = (key) => `w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition ${fieldErrors[key] ? 'border-red-300' : 'border-gray-200'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-mustard-50 via-white to-navy-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center mb-8"><M2MLogo /></Link>
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800 mb-6 transition">← Back to Sign In</Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-500">Join Mitti2Market and start trading</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4"><AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /><p className="text-sm text-red-700">{error}</p></div>}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'farmer', emoji: '👨‍🌾', label: 'Farmer' }, { value: 'business', emoji: '🏪', label: 'Business' }].map((r) => (
                <button key={r.value} type="button" onClick={() => update('role', r.value)}
                  className={`p-4 rounded-xl border-2 text-left transition ${form.role === r.value ? 'border-mustard-400 bg-mustard-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-2xl block mb-1">{r.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                </button>
              ))}
            </div>
            {fieldErrors.role && <p className="text-xs text-red-500 mt-1">{fieldErrors.role}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><User className="w-5 h-5 text-gray-400" /></div>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" className={inputClass('name')} /></div>
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Mail className="w-5 h-5 text-gray-400" /></div>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className={inputClass('email')} /></div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-gray-400">(optional)</span></label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Phone className="w-5 h-5 text-gray-400" /></div>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass('phone')} /></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></div>
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters"
                className={`w-full pl-11 pr-11 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mustard-400 focus:border-transparent transition ${fieldErrors.password ? 'border-red-300' : 'border-gray-200'}`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center">{showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}</button></div>
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative"><div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><Lock className="w-5 h-5 text-gray-400" /></div>
              <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Re-enter password" className={inputClass('confirmPassword')} /></div>
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-navy-900 text-white font-semibold rounded-xl hover:bg-navy-800 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account? <Link to="/login" className="text-navy-700 font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
