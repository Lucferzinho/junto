'use client'

import { useState, useEffect } from 'react'
import { supabase, Usuario } from '../../lib/supabase'

export default function Perfil() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [formEmail, setFormEmail] = useState('')
  const [formSenha, setFormSenha] = useState('')
  const [formNome, setFormNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [pace, setPace] = useState('')
  const [nivel, setNivel] = useState('iniciante')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarPerfil()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) carregarPerfil()
      else { setUsuario(null); setEmail(''); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function carregarPerfil() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setEmail(user.email ?? '')
    const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    if (data) {
      setUsuario(data)
      setNome(data.nome ?? '')
      setCidade(data.cidade ?? '')
      setPace(data.pace_medio ?? '')
      setNivel(data.nivel ?? 'iniciante')
    }
    setLoading(false)
  }

  async function entrar() {
    setEnviando(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email: formEmail, password: formSenha })
    if (error) setMsg('Email ou senha incorretos.')
    setEnviando(false)
  }

  async function cadastrar() {
    if (!formNome) { setMsg('Digite seu nome.'); return }
    setEnviando(true)
    setMsg('')
    const { data, error } = await supabase.auth.signUp({ email: formEmail, password: formSenha })
    if (error) { setMsg('Erro: ' + error.message); setEnviando(false); return }
    if (data.user) {
      await supabase.from('usuarios').insert({ id: data.user.id, nome: formNome, email: formEmail, cidade: 'Rio de Janeiro', nivel: 'iniciante' })
    }
    setMsg('Conta criada! Verifique seu email para confirmar.')
    setEnviando(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUsuario(null)
    setEmail('')
  }

  async function salvarPerfil() {
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('usuarios').upsert({ id: user.id, nome, email: user.email, cidade, pace_medio: pace, nivel })
    if (!error) { await carregarPerfil(); setEditando(false) }
    else alert('Erro ao salvar: ' + error.message)
    setSalvando(false)
  }

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 10 } as React.CSSProperties

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>Carregando...
    </div>
  )

  if (!email) return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏃</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 4 }}>Boas-vindas ao Juntô!</div>
        <div style={{ fontSize: 13, color: '#888' }}>Corre junto é muito melhor.</div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 20 }}>
        {(['login', 'cadastro'] as const).map(m => (
          <button key={m} onClick={() => { setModo(m); setMsg('') }} style={{ flex: 1, padding: '8px 0', fontSize: 14, fontWeight: modo === m ? 600 : 400, color: modo === m ? '#1D9E75' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${modo === m ? '#1D9E75' : 'transparent'}`, cursor: 'pointer' }}>
            {m === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {modo === 'cadastro' && (
        <input style={inp} placeholder="Seu nome" value={formNome} onChange={e => setFormNome(e.target.value)} />
      )}
      <input style={inp} type="email" placeholder="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
      <input style={inp} type="password" placeholder="Senha (mín. 6 caracteres)" value={formSenha} onChange={e => setFormSenha(e.target.value)} onKeyDown={e => e.key === 'Enter' && (modo === 'login' ? entrar() : cadastrar())} />

      {msg && <div style={{ fontSize: 13, color: msg.includes('criada') ? '#1D9E75' : '#c00', marginBottom: 12 }}>{msg}</div>}

      <button onClick={modo === 'login' ? entrar : cadastrar} disabled={enviando} style={{ width: '100%', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        {enviando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
      </button>
    </div>
  )

  const inits = (usuario?.nome || email).slice(0, 2).toUpperCase()

  return (
    <div>
      <div style={{ padding: '24px 16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          {inits}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 4 }}>{usuario?.nome || 'Sem nome ainda'}</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{email}</div>
        <button onClick={() => setEditando(!editando)} style={{ fontSize: 13, padding: '6px 18px', border: '1px solid #1D9E75', color: '#1D9E75', background: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {editando ? 'Cancelar' : '✏️ Editar perfil'}
        </button>
      </div>

      {editando && (
        <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Nome', value: nome, set: setNome, placeholder: 'Seu nome' },
            { label: 'Cidade', value: cidade, set: setCidade, placeholder: 'Ex: Rio de Janeiro' },
            { label: 'Pace médio', value: pace, set: setPace, placeholder: 'Ex: 5:30' },
          ].map(f => (
            <div key={f.label}>
              <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Nível</label>
            <select value={nivel} onChange={e => setNivel(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, outline: 'none' }}>
              <option value="iniciante">Iniciante</option>
              <option value="intermediário">Intermediário</option>
              <option value="avançado">Avançado</option>
            </select>
          </div>
          <button onClick={salvarPerfil} disabled={salvando} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {salvando ? 'Salvando...' : '💾 Salvar'}
          </button>
        </div>
      )}

      {usuario && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #eee' }}>
          {[{ n: usuario.pace_medio || '–', l: 'Pace médio' }, { n: usuario.nivel || '–', l: 'Nível' }].map(s => (
            <div key={s.l} style={{ padding: 16, textAlign: 'center', borderRight: '1px solid #eee' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{s.n}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {usuario?.cidade && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📍</span><span style={{ fontSize: 14, color: '#444' }}>{usuario.cidade}</span>
        </div>
      )}

      <div style={{ padding: 16 }}>
        <button onClick={logout} style={{ width: '100%', padding: 11, border: '1px solid #eee', borderRadius: 8, fontSize: 14, color: '#888', background: 'none', cursor: 'pointer' }}>
          Sair da conta
        </button>
      </div>
    </div>
  )
}