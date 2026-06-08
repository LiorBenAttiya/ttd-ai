import { useState, FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const [remember, setRemember] = useState(true)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password'); return }
    setError(''); setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden"
         style={{ background: 'linear-gradient(165deg, #060B14 0%, #0A0F1E 35%, #0D1424 65%, #080D1A 100%)' }}>

      {/* Animated orbs */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 700, height: 700, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)',
                    animation: 'orb1 12s ease-in-out infinite alternate', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)',
                    animation: 'orb2 15s ease-in-out infinite alternate', pointerEvents: 'none' }} />

      {/* Login card */}
      <div className="relative w-full max-w-sm mx-6 rounded-3xl overflow-hidden"
           style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>

        {/* Top gradient bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #3B82F6, #8B5CF6, #06B6D4, #3B82F6)',
                      backgroundSize: '300% 100%', animation: 'auroraShift 4s linear infinite' }} />

        <div className="px-8 py-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl mb-4 relative overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)',
                          boxShadow: '0 0 40px rgba(59,130,246,0.5), 0 8px 24px rgba(0,0,0,0.4)' }}>
              <span style={{ position: 'relative', zIndex: 1, color: '#fff', letterSpacing: '-0.5px' }}>AI</span>
              <div style={{ position: 'absolute', inset: 0,
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                            borderRadius: 'inherit' }} />
            </div>
            <h1 className="font-black tracking-tight" style={{ fontSize: '24px',
                background: 'linear-gradient(135deg, #F8FAFC, #CBD5E1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TTD AI
            </h1>
            <p style={{ fontSize: '13px', color: '#475569', marginTop: 4 }}>
              Personal & Business Task Tracker
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B',
                              textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Email address
              </label>
              <div className="relative">
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                              fontSize: '16px', pointerEvents: 'none' }}>📧</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                       placeholder="lior@lbatech.com" autoComplete="email" autoFocus
                       className="w-full input-base py-3"
                       style={{ fontSize: '14px', paddingLeft: 42, paddingRight: 14 }}
                       onFocus={e  => { e.target.style.borderColor = 'rgba(59,130,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12), 0 0 16px rgba(59,130,246,0.1)' }}
                       onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B',
                              textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div className="relative">
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                              fontSize: '16px', pointerEvents: 'none' }}>🔐</div>
                <input type={showPwd ? 'text' : 'password'}
                       value={password} onChange={e => setPassword(e.target.value)}
                       placeholder="••••••••" autoComplete="current-password"
                       className="w-full input-base py-3"
                       style={{ fontSize: '14px', paddingLeft: 42, paddingRight: 44 }}
                       onFocus={e  => { e.target.style.borderColor = 'rgba(59,130,246,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12), 0 0 16px rgba(59,130,246,0.1)' }}
                       onBlur={e   => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }} />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                 color: '#475569', fontSize: '16px', background: 'none', border: 'none',
                                 cursor: 'pointer', padding: 4 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px', color: '#64748B' }}>
                <div onClick={() => setRemember(r => !r)}
                     className="w-4 h-4 rounded flex items-center justify-center transition-all"
                     style={{ background: remember ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.08)',
                              border: `1px solid ${remember ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.15)'}`,
                              cursor: 'pointer' }}>
                  {remember && <span style={{ fontSize: '10px', color: '#fff' }}>✓</span>}
                </div>
                Remember me
              </label>
              <button type="button"
                      style={{ fontSize: '12px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                   style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <span style={{ fontSize: '12px', color: '#FCA5A5' }}>{error}</span>
              </div>
            )}

            {/* Sign in button */}
            <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl font-bold transition-all relative overflow-hidden"
                    style={{ fontSize: '14px', marginTop: 4,
                             background: loading
                               ? 'rgba(59,130,246,0.4)'
                               : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #06B6D4 100%)',
                             backgroundSize: '200% 100%',
                             color: '#fff',
                             border: '1px solid rgba(59,130,246,0.4)',
                             boxShadow: loading ? 'none' : '0 0 24px rgba(59,130,246,0.4), 0 4px 16px rgba(0,0,0,0.4)',
                             animation: loading ? 'none' : 'auroraShift 4s linear infinite',
                             letterSpacing: '-0.01em' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                                  animation: 'spin 0.8s linear infinite' }} />
                  Signing in…
                </span>
              ) : 'Sign in to TTD AI →'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-6" style={{ fontSize: '11px', color: '#1E293B' }}>
            Personal access only · Lior B.A.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-40px,30px) scale(1.1); } }
        @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-40px) scale(0.95); } }
        @keyframes auroraShift { 0% { background-position: 0% 0; } 100% { background-position: 300% 0; } }
      `}</style>
    </div>
  )
}
