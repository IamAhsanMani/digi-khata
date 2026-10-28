import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Trash2,
  Key,
} from 'lucide-react';
import { getTranslations } from '@/lib/i18n.js';
import { inviteTeamMemberRemote, removeTeamMemberRemote, sendPasswordResetForTeamMember, createTeamMemberRemote, loadWorkspaceState,  } from '@/lib/db.js';

export default function TeamManagement({ state, currentLang = 'en', onUpdateState }) {
  const t = getTranslations(currentLang);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [errorMsg, setErrorMsg] = useState('');

  // 60-second one-time password display modal state (Section 5B)
  const [generatedResult, setGeneratedResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  useEffect(() => {
    let timer = null;
    if (generatedResult?.password && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setGeneratedResult(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [generatedResult, secondsRemaining]);

  // const handleCreateMember = async (e) => {
  //   e.preventDefault();
  //   setErrorMsg('');

  //   if (!fullName.trim() || !email.trim()) {
  //     setErrorMsg('Full Name and Email are required');
  //     return;
  //   }

  //   if (role === 'owner') {
  //     setErrorMsg('Cannot create member with Owner role.');
  //     return;
  //   }

  //   const res = await inviteTeamMemberRemote({
  //     fullName: fullName.trim(),
  //     email: email.trim(),
  //     role,
  //   });

  //   if (res.success) {
  //     setShowAddModal(false);
  //     setFullName('');
  //     setEmail('');
  //     setRole('staff');
  //     setSecondsRemaining(60);
  //     setShowPassword(false);
  //     setGeneratedResult({
  //       email: res.member.email,
  //       password: '',
  //       message: res.message || 'Invitation email sent. The member must accept the invitation to access DigiKhata.',
  //     });
  //     onUpdateState();
  //   } else {
  //     setErrorMsg(res.error || 'Failed to create team member');
  //   }
  // };


const handleCreateMember = async (e) => {
  e.preventDefault();
  setErrorMsg("");

  if (!fullName.trim() || !email.trim()) {
    setErrorMsg("Full Name and Email are required");
    return;
  }

  if (role === "owner") {
    setErrorMsg("Cannot create member with Owner role.");
    return;
  }

  try {
 
    const res = await createTeamMemberRemote({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      // business_id: currentBusinessId,
    });

    if (!res.success) {
      setErrorMsg(res.error || "Failed to create team member");
      return;
    }

    setShowAddModal(false);
    setFullName("");
    setEmail("");
    setRole("staff");
    setSecondsRemaining(60);
    setShowPassword(false);

    setGeneratedResult({
      email: res.member.email,
      password: res.member.password,
      message:
        "Account created successfully. Share these temporary credentials securely.",
    });

    onUpdateState();
  } catch (error) {
    setErrorMsg(
      error instanceof Error
        ? error.message
        : "Failed to create team member",
    );
  }
};


  const handleResetMemberPassword = async (member) => {
    const res = await sendPasswordResetForTeamMember(member.email);
    if (!res.success) {
      setErrorMsg(res.error || 'Unable to send password reset email.');
      return;
    }
    setGeneratedResult({
      email: member.email,
      password: '',
      message: `Password reset email sent to ${member.email}. The member can set a new password using the secure link.`,
    });
  };

  const handleRemoveMember = async (memberId) => {
    if (memberId === state.currentUser?.id) {
      alert('Cannot remove your own account.');
      return;
    }
    if (confirm('Revoke this member’s access to the business?')) {
      const res = await removeTeamMemberRemote(memberId);
      if (!res.success) {
        setErrorMsg(res.error || 'Unable to remove team member.');
        return;
      }
      onUpdateState();
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard?.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="pb-24 max-w-md md:max-w-xl mx-auto w-full p-3 space-y-4">
      {/* Header card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t.team}</h2>
          <p className="text-xs text-slate-500">
            Store accountants, cashiers, and staff authorizations
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addMember}</span>
        </button>
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        {state.teamMembers.map((member) => {
          const isCurrent = member.id === state.currentUser?.id;
          return (
            <div
              key={member.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0 uppercase">
                  {member.fullName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2 truncate">
                    <span>{member.fullName}</span>
                    {isCurrent && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{member.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      <Shield className="w-3 h-3 text-blue-600" />
                      {t.roles[member.role] || member.role}
                    </span>
                    {member.mustChangePassword && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        Password Reset Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {member.role !== 'owner' && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleResetMemberPassword(member)}
                    title="Generate New Password"
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    title="Remove Member"
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Member Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">{t.addMember}</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter details. A cryptographically secure random password will be generated.
            </p>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2 rounded-xl mb-3">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.fullName} *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Asad Store Manager"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.email} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="asad@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {t.role}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 outline-none"
                >
                  <option value="manager">{t.roles.manager}</option>
                  <option value="accountant">{t.roles.accountant}</option>
                  <option value="staff">{t.roles.staff}</option>
                  <option value="read_only">{t.roles.read_only}</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Generate & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 60-Second One-Time Password Display Modal (Section 5B) */}
      {generatedResult && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-300">
            <div className="flex items-center gap-2 text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <p className="text-xs font-semibold leading-tight">
                {generatedResult.message || 'Invitation email sent. The member must accept the invitation to access DigiKhata.'}
              </p>
            </div>

            {generatedResult.password && <div className="flex items-center justify-between bg-slate-100 rounded-xl p-2.5 mb-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                {t.passwordExpiresIn}
              </span>
              <span className="font-bold text-rose-600 text-sm">{secondsRemaining}s</span>
            </div>}

            <div className="mb-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t.email}
              </label>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-xs font-mono text-slate-800 truncate mr-2 select-all">
                  {generatedResult.email}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedResult.email, 'email')}
                  className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {generatedResult.password ? <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Auto-Generated Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 font-bold cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between bg-slate-900 text-white border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs">
                <span className="tracking-wider select-all">
                  {showPassword ? generatedResult.password : '••••••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(generatedResult.password, 'password')}
                  className="p-1 text-slate-300 hover:text-white cursor-pointer ml-2"
                >
                  {copiedPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div> : <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 mb-4">No password is generated or shown here. The invited member will set up access through the secure Supabase email invitation.</p>}

            <button
              type="button"
              onClick={() => setGeneratedResult(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              {t.closeModal} (Clear from memory)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
