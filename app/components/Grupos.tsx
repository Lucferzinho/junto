'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

type Grupo = {
  id: string
  nome: string
  descricao: string
  criador_id: string
  grupo_membros?: { id: string }[]
}

type Membro = {
  id: string
  nome: string
  avatar_url: string | null
  pace_medio: string | null
  nivel: string | null
}

function initials(nome: string) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [membros, setMembros] = useState<Record<string, string>>({})
  const [grupoAberto, setGrupoAberto] = useState<Grupo | null>(null)
  const [membrosGrupo, setMembrosGrupo] = useState<Membro[]>([])
  const [criando, setCriando] = useState(false)
  const [formNome, setFormNome] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [entrando, setEntrando] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        carregarMembros(data.user.id)
      }
    })
    carregarGrupos()
  }, [])

  async function carregarGrupos() {
    setLoading(true)
    const { data } = await supabase
      .from('grupos')
      .select('*, grupo_membros(id)')
      .order('criado_em', { ascending: false })
    if (data) setGrupos(data)
    setLoading(false)
  }

  async function carregarMembros(uid: string) {
    const { data } = await supabase.from('grupo_membros').select('id, grupo_id').eq('usuario_id', uid)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach((m: any) => { map[m.grupo_id] = m.id })
      setMembros(map)
    }
  }

  async function abrirGrupo(grupo: Grupo) {
    setGrupoAberto(grupo)
    const { data } = await supabase
      .from('grupo_membros')
      .select('usuarios(id, nome, avatar_url, pace_medio, nivel)')
      .eq('grupo_id', grupo.id)
    if (data) {
      const ms = data.map((d: any) => d.usuarios).filter(Boolean)
      setMembrosGrupo(ms)
    }
  }

  async function entrarGrupo(e: React.MouseEvent, grupoId: string) {
    e.stopPropagation()
    if (!userId) { alert('Faça login para entrar no grupo!'); return }
    setEntrando(grupoId)
    const { error, data: novo } = await supabase
      .from('grupo_membros')
      .insert({ grupo_id: grupoId, usuario_id: userId })
      .select('id')
      .single()
    if (error) { alert('Erro: ' + error.message); setEntrando(null); return }
    if (novo) setMembros(prev => ({ ...prev, [grupoId]: novo.id }))
    await carregarGrupos()
    setEntrando(null)
  }

  async function sairGrupo(e: React.MouseEvent, grupoId: string) {
    e.stopPropagation()
    if (!confirm('Tem certeza que quer sair do grupo?')) return
    setEntrando(grupoId)
    const { error } = await supabase.from('grupo_membros').delete().eq('id', membros[grupoId])
    if (error) { alert('Erro: ' + error.message); setEntrando(null); return }
    setMembros(prev => { const n = { ...prev }; delete n[grupoId]; return n })
    await carregarGrupos()
    setEntrando(null)
  }

  async function criarGrupo() {
    if (!formNome.trim()) { alert('Digite o nome do grupo!'); return }
    if (!userId) { alert('Faça login para criar um grupo!'); return }
    setSalvando(true)
    const { data: grupo, error } = await supabase
      .from('grupos')
      .insert({ nome: formNome.trim(), descricao: formDesc.trim(), criador_id: userId })
      .select('id')
      .single()
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    if (grupo) {
      await supabase.from('grupo_membros').insert({ grupo_id: grupo.id, usuario_id: userId })
      setMembros(prev => ({ ...prev, [grupo.id]: grupo.id }))
    }
    setFormNome('')
    setFormDesc('')
    setSalvando(false)
    setCriando(false)
    await carregarGrupos()
  }

  const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid #ddd',
    borderRadius: 8, fontSize: 14, outline: 'none',
    fontFamily: "'Barlow', sans-serif", marginBottom: 10,
    boxSizing: 'border-box' as const
  }

  // Detalhe do grupo
  if (grupoAberto) return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => setGrupoAberto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 22, padding: 0 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{grupoAberto.nome}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{membrosGrupo.length} membro{membrosGrupo.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {grupoAberto.descricao && (
        <div style={{ padding: '12px 16px', background: '#f9f9f9', borderBottom: '1px solid #eee', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
          {grupoAberto.descricao}
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Membros</div>
        {membrosGrupo.map((m, i) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < membrosGrupo.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            {m.avatar_url
              ? <img src={m.avatar_url} alt={m.nome} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(m.nome)}</div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{m.nome}</div>
              <div style={{ fontSize: 12, color: '#888' }}>
                {m.pace_medio && `⚡ ${m.pace_medio} /km`}{m.nivel && ` · ${m.nivel}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Grupos</h2>
        <button onClick={() => setCriando(!criando)} style={{ fontSize: 12, padding: '6px 14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
          {criando ? 'Cancelar' : '+ Criar grupo'}
        </button>
      </div>

      {criando && (
        <div style={{ padding: 16, borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>Novo grupo</div>
          <input style={inp} placeholder="Nome do grupo *" value={formNome} onChange={e => setFormNome(e.target.value)} />
          <textarea rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Descrição (opcional)" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
          <button onClick={criarGrupo} disabled={salvando} style={{ width: '100%', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, padding: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
            {salvando ? 'Criando...' : '✅ Criar grupo'}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>Carregando grupos...
        </div>
      )}

      {!loading && grupos.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nenhum grupo ainda.</div>
          <div style={{ fontSize: 13 }}>Crie o primeiro e convide seus parceiros de corrida!</div>
        </div>
      )}

      {grupos.map(g => {
        const totalMembros = g.grupo_membros?.length ?? 0
        const isMembro = !!membros[g.id]
        const isCriador = userId === g.criador_id

        return (
          <div key={g.id} onClick={() => abrirGrupo(g)} style={{ padding: 16, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E1F5EE', color: '#085041', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>
                {g.nome.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 2 }}>
                  {g.nome}
                  {isCriador && <span style={{ fontSize: 11, marginLeft: 6, color: '#1D9E75', fontWeight: 600 }}>⭐ seu grupo</span>}
                </div>
                {g.descricao && <div style={{ fontSize: 12, color: '#888', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.descricao}</div>}
                <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>👥 {totalMembros} membro{totalMembros !== 1 ? 's' : ''}</div>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                {isMembro
                  ? <button onClick={e => sairGrupo(e, g.id)} disabled={entrando === g.id} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
                      {entrando === g.id ? '...' : 'Sair'}
                    </button>
                  : <button onClick={e => entrarGrupo(e, g.id)} disabled={entrando === g.id} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #1D9E75', color: '#1D9E75', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                      {entrando === g.id ? '...' : 'Entrar'}
                    </button>
                }
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}