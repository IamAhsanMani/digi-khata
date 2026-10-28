import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle2, Upload, Trash2, Building2 } from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { supabase, createBusinessAccount, loadWorkspaceState } from '@/lib/db.js';
import CompanyLogo from '@/components/layout/CompanyLogo.jsx';

export default function AuthPages({ currentLang = 'en', onAuthenticated, initialMode = 'signin', onPasswordRecovered }) {
  const t = getTranslations(currentLang);
  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup' | 'force_change' | 'setup_business'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [businessLogoUrl, setBusinessLogoUrl] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (error) throw error;
      const loaded = await loadWorkspaceState(data.user);
      console.log('loaded',loaded)
      if (loaded.needsBusiness) {
        setPendingUser(loaded.state.currentUser);
        setBusinessNameInput(`${loaded.state.currentUser.fullName || 'My'} Business`);
        setBusinessLogoUrl(null);
        setMode('setup_business');
        setNoticeMsg('Sign-in successful. Complete your business setup to continue.');
        return;
      }
      onAuthenticated(loaded.state.currentUser);
    } catch (error) {
      setErrorMsg(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setNoticeMsg('Password updated. Please sign in with your new password.');
      await supabase.auth.signOut();
      setPassword('');
      setConfirmPassword('');
      setMode('signin');
      onPasswordRecovered?.();
    } catch (error) {
      setErrorMsg(error.message || 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Check your .env.local settings.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Enter your account email first.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/?type=recovery`,
      });
      if (error) throw error;
      setNoticeMsg('If this email is registered, a password reset link has been sent.');
      setMode('signin');
    } catch (error) {
      setErrorMsg(error.message || 'Unable to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setNoticeMsg('');
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;

      if (!data.session || !data.user) {
        setMode('signin');
        setNoticeMsg('Account created. Check your email to confirm the address, then sign in to finish business setup.');
        return;
      }

      setPendingUser({
        id: data.user.id, fullName: fullName.trim(), email: email.trim(),
        role: 'owner', businessId: null,
      });
      setBusinessNameInput(`${fullName.trim()}'s Business`);
      setBusinessLogoUrl(null);
      setMode('setup_business');
      setNoticeMsg('Account created. Now set up your business.');
    } catch (error) {
      setErrorMsg(error.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      alert('Please select an image smaller than 2.5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setBusinessLogoUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFinishBusinessSetup = async (e) => {
    e?.preventDefault?.();
    setErrorMsg('');
    if (!businessNameInput.trim()) {
      setErrorMsg('Please enter your business name.');
      return;
    }
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Please check your environment variables.');
      return;
    }
    setLoading(true);
    try {
      const result = await createBusinessAccount({
        name: businessNameInput.trim(),
        logoUrl: businessLogoUrl || null,
      });
      console.log('result',result)
      onAuthenticated(result.state.currentUser);
    } catch (error) {
      setErrorMsg(error.message || 'Unable to save your business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForcePasswordChange = (e) => {
    e.preventDefault();
    setErrorMsg('Team password changes must be completed through Supabase Auth. Please sign in with your own account.');
    setMode('signin');
  };


  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-3 font-black text-xl">
            DK
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {t.appName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Modern Digital Khata & Business Accounts
          </p>
        </div>

        {noticeMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noticeMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl mb-4">
            {errorMsg}
          </div>
        )}

        {mode === 'recovery' ? (
          <form onSubmit={handlePasswordRecovery} className="space-y-3">
            <p className="text-xs text-slate-600">Choose a new password for your account.</p>
            <label className="block text-xs font-semibold text-slate-700">New password</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
            <label className="block text-xs font-semibold text-slate-700">Confirm new password</label>
            <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
            <button type="submit" disabled={loading} className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl disabled:opacity-50">{loading ? 'Updating…' : 'Update password'}</button>
          </form>
        ) : mode === 'setup_business' ? (
          <form onSubmit={handleFinishBusinessSetup} className="space-y-4">
            <div className="bg-blue-50/80 border border-blue-200 text-blue-900 p-3.5 rounded-2xl text-xs">
              <p className="font-bold">{t.setupCompanyProfile}</p>
              <p className="text-[11px] text-blue-700/90 mt-0.5">
                {t.setupCompanySubtitle}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.businessName} *
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <Building2 className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  required
                  value={businessNameInput}
                  onChange={(e) => setBusinessNameInput(e.target.value)}
                  placeholder="e.g. Al-Madina Cloth House"
                  className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                />
              </div>
            </div>

            {/* Company Logo Upload & Live Initials Preview */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                {t.companyLogo}
              </label>

              <div className="flex items-center gap-3.5">
                <CompanyLogo
                  business={{ name: businessNameInput || 'My Shop', logoUrl: businessLogoUrl }}
                  size="xl"
                />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{businessLogoUrl ? t.changeLogo : t.uploadLogo}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {businessLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setBusinessLogoUrl(null)}
                        className="flex items-center gap-1 px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.removeLogo}</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {t.companyLogoHint}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t.save} & Enter DigiKhata</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFinishBusinessSetup}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                {t.continueWithInitials}
              </button>
            </div>
          </form>
        ) : mode === 'force_change' ? (
          <form onSubmit={handleForcePasswordChange} className="space-y-4">
            <div className="bg-slate-100 border border-slate-200 text-slate-800 p-3 rounded-2xl text-xs">
              <p className="font-bold">{t.mustChangePassword}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                For security reasons, your temporary auto-generated password must be changed before entering.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.newPassword}
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.confirmPassword}
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {t.changePasswordButton}
            </button>
          </form>
        ) : (
          <form onSubmit={mode === 'signin' ? handleSignIn : mode === 'forgot' ? handleForgotPassword : handleSignUp} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.fullName}
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ahsan Store Owner"
                    className="w-full bg-transparent text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.email}
              </label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            {mode !== 'forgot' && (<>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {t.password}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                      setNoticeMsg('Enter your email to receive a password reset link.');
                    }}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-xs text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === 'signup' && password && (
                <div className="mt-1.5 flex gap-1 items-center">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 flex-1 rounded-full ${
                        strength >= step
                          ? strength >= 3
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            </>)}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.confirmPassword}
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
            >
              <span>{loading ? 'Processing...' : mode === 'signin' ? t.signIn : mode === 'forgot' ? 'Send reset link' : t.signUp}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-500 pt-2">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                    }}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {t.signUp}
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg('');
                    }}
                    className="font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {t.signIn}
                  </button>
                </>
              )}
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
