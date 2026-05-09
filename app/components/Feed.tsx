'use client'

import { useState, useEffect } from 'react'
import { supabase, Treino } from '../../lib/supabase'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtData(d: string) {
  if (!d) return ''
  const [, m, dia] = d.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(m) - 1]}`
}

function initials(nome: string) {
  if (!nome) return '?'
  const parts = nome.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function inscricoesEncerradas(data: string, horario: string) {
  if (!data || !horario) return false
  const treino = new Date(`${data}T${horario}`)
  const agora = new Date()
  return treino.getTime() - agora.getTime() < 15 * 60 * 1000
}

const TOM_STYLE: Record<string, { bg: string; color: string }> = {
  'Leve e papo':    { bg: '#E6F1FB', color: '#0C447C' },
  'Focado':         { bg: '#FBEAF0', color: '#72243E' },
  'Qualquer nível': { bg: '#EAF3DE', color: '#27500A' },
}

const TIPOS = ['Long run','Intervalado','Progressivo','Tempo run','Regenerativo','Corrida livre']
const TOMS = ['Leve e papo','Focado','Qualquer nível']

type Props = {
  treinos: Treino[]
  loading: boolean
  onAbrirChat: (t: Treino) => void
  onAtualizar: () => void
}

export default function Feed({ treinos, loading, onAbrirChat, onAtualizar }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [inscricoes, setInscricoes] = useState<Record<string, string>>({})
  const [listaEspera, setListaEspera] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState<string | null>(null)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTom, setFiltroTom] = useState('')
  const [filtroIniciantes, setFiltroIniciantes] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        carregarInscricoes(data.user.id)
        carregarListaEspera(data.user.id)
      }
    })
  }, [treinos])

  async function carregarInscricoes(uid: string) {
    const { data } = await supabase.from('inscricoes').select('id, treino_id').eq('usuario_id', uid)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(i => { map[i.treino_id] = i.id })
      setInscricoes(map)
    }
  }

  async function carregarListaEspera(uid: string) {
    const { data } = await supabase.from('lista_espera').select('id, treino_id').eq('usuario_id', uid)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(i => { map[i.treino_id] = i.id })
      setListaEspera(map)
    }
  }

  async function participar(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    if (!userId) { alert('Faça login para participar!'); return }
    setCarregando(treino.id)
    const { error, data: nova } = await supabase.from('inscricoes').insert({ treino_id: treino.id, usuario_id: userId }).select('id').single()
    if (error) { alert('Erro ao se inscrever: ' + error.message); setCarregando(null); return }
    if (nova) setInscricoes(prev => ({ ...prev, [treino.id]: nova.id }))
    const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', userId).single()
    const { data: { user } } = await supabase.auth.getUser()
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user?.email,
        nome: usuario?.nome || 'Corredor',
        treino: { titulo: treino.titulo, data: fmtData(treino.data), horario: treino.horario?.slice(0,5), local: treino.local, km: treino.km, pace: treino.pace, tom: treino.tom }
      })
    })
    await onAtualizar()
    setCarregando(null)
  }

  async function sairDoTreino(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    if (!confirm('Tem certeza que quer sair deste treino?')) return
    setCarregando(treino.id)
    const { error } = await supabase.from('inscricoes').delete().eq('id', inscricoes[treino.id])
    if (error) { alert('Erro ao sair: ' + error.message); setCarregando(null); return }
    setInscricoes(prev => { const n = { ...prev }; delete n[treino.id]; return n })
    await fetch('/api/vaga-aberta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ treino_id: treino.id, titulo: treino.titulo, data: fmtData(treino.data), horario: treino.horario?.slice(0,5), local: treino.local })
    })
    await onAtualizar()
    setCarregando(null)
  }

  async function cancelarTreino(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    if (!confirm('Tem certeza que quer cancelar este treino? Ele sumirá do feed para todos.')) return
    setCarregando(treino.id)
    const { error } = await supabase.from('treinos').update({ status: 'cancelado' }).eq('id', treino.id)
    if (error) { alert('Erro ao cancelar: ' + error.message); setCarregando(null); return }
    await onAtualizar()
    setCarregando(null)
  }

  async function entrarListaEspera(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    if (!userId) { alert('Faça login para entrar na lista de espera!'); return }
    setCarregando(treino.id + '-espera')
    const { error, data: nova } = await supabase.from('lista_espera').insert({ treino_id: treino.id, usuario_id: userId }).select('id').single()
    if (error) { alert('Erro: ' + error.message); setCarregando(null); return }
    if (nova) setListaEspera(prev => ({ ...prev, [treino.id]: nova.id }))
    setCarregando(null)
  }

  async function sairListaEspera(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    setCarregando(treino.id + '-espera')
    const { error } = await supabase.from('lista_espera').delete().eq('id', listaEspera[treino.id])
    if (error) { alert('Erro: ' + error.message); setCarregando(null); return }
    setListaEspera(prev => { const n = { ...prev }; delete n[treino.id]; return n })
    setCarregando(null)
  }

  // Aplica filtros
  const treinosFiltrados = treinos.filter(r => {
    if (filtroTipo && r.tipo !== filtroTipo) return false
    if (filtroTom && r.tom !== filtroTom) return false
    if (filtroIniciantes && !r.aberto_iniciantes) return false
    return true
  })

  const temFiltroAtivo = filtroTipo || filtroTom || filtroIniciantes

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏃</div>
      Carregando treinos...
    </div>
  )

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      {/* Header + filtros */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mostrarFiltros ? 12 : 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Perto de você</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{treinosFiltrados.length} treino{treinosFiltrados.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ fontSize: 12, padding: '4px 12px', border: `1px solid ${temFiltroAtivo ? '#1D9E75' : '#ddd'}`, color: temFiltroAtivo ? '#1D9E75' : '#888', background: temFiltroAtivo ? '#E1F5EE' : '#fff', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {temFiltroAtivo ? '🔍 Filtros ativos' : '🔍 Filtrar'}
            </button>
          </div>
        </div>

        {/* Painel de filtros */}
        {mostrarFiltros && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {/* Tipo */}
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Tipo de treino</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TIPOS.map(t => (
                  <button key={t} onClick={() => setFiltroTipo(filtroTipo === t ? '' : t)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${filtroTipo === t ? '#1D9E75' : '#ddd'}`, background: filtroTipo === t ? '#E1F5EE' : '#fff', color: filtroTipo === t ? '#085041' : '#666', cursor: 'pointer', fontWeight: filtroTipo === t ? 700 : 500, fontFamily: "'Barlow', sans-serif" }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tom */}
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Tom do treino</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TOMS.map(t => {
                  const s = TOM_STYLE[t]
                  const sel = filtroTom === t
                  return (
                    <button key={t} onClick={() => setFiltroTom(filtroTom === t ? '' : t)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${sel ? s.color : '#ddd'}`, background: sel ? s.bg : '#fff', color: sel ? s.color : '#666', cursor: 'pointer', fontWeight: sel ? 700 : 500, fontFamily: "'Barlow', sans-serif" }}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Iniciantes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Só abertos a iniciantes</span>
              <div onClick={() => setFiltroIniciantes(!filtroIniciantes)} style={{ width: 36, height: 20, background: filtroIniciantes ? '#1D9E75' : '#ddd', borderRadius: 20, position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                <div style={{ position: 'absolute', width: 14, height: 14, background: '#fff', borderRadius: '50%', top: 3, left: filtroIniciantes ? 19 : 3, transition: 'left .2s' }} />
              </div>
            </div>

            {/* Limpar filtros */}
            {temFiltroAtivo && (
              <button onClick={() => { setFiltroTipo(''); setFiltroTom(''); setFiltroIniciantes(false) }} style={{ fontSize: 12, color: '#cc3333', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left', padding: 0, fontFamily: "'Barlow', sans-serif" }}>
                ✕ Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {treinosFiltrados.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Nenhum treino com esses filtros.</div>
          <div style={{ fontSize: 13 }}>Tenta ajustar os filtros ou cria um treino!</div>
        </div>
      )}

      {treinosFiltrados.map((r) => {
        const inscritos = r.inscricoes?.length ?? 0
        const full = inscritos >= r.max_pessoas
        const tom = TOM_STYLE[r.tom] ?? TOM_STYLE['Qualquer nível']
        const isCriador = userId === r.criador_id
        const isInscrito = !!inscricoes[r.id]
        const naEspera = !!listaEspera[r.id]
        const nomeHost = (r as any).usuarios?.nome || 'Corredor'
        const avatarUrl = (r as any).usuarios?.avatar_url
        const hoje = new Date().toISOString().split('T')[0]
        const isHoje = r.data === hoje
        const encerrado = inscricoesEncerradas(r.data, r.horario)

        return (
          <div key={r.id} onClick={() => onAbrirChat(r)} style={{ padding: 16, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={nomeHost} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {initials(nomeHost)}
                    </div>
                }
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#111', marginBottom: 2, lineHeight: 1.2 }}>{r.titulo}</div>
                  <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>
                    {isCriador ? '⭐ criado por você' : `por ${nomeHost}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                {isHoje && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#FFF3E0', color: '#E65100', fontWeight: 700 }}>🔥 Hoje!</span>}
                {encerrado
                  ? <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#f0f0f0', color: '#888', fontWeight: 700 }}>Inscrições encerradas</span>
                  : <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: full ? '#FAEEDA' : '#E1F5EE', color: full ? '#633806' : '#085041', fontWeight: 700 }}>
                      {full ? 'Lotado' : 'Vagas abertas'}
                    </span>
                }
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: tom.bg, color: tom.color, fontWeight: 600 }}>{r.tom}</span>
                {r.aberto_iniciantes && (
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>Iniciantes bem-vindos</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {[
                { e: '📅', t: `${fmtData(r.data)} · ${r.horario?.slice(0,5)}` },
                { e: '📍', t: r.local },
                { e: '🛣️', t: `${r.km} km` },
                { e: '⚡', t: `${r.pace} /km` },
              ].map((m) => (
                <span key={m.t} style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.e} {m.t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', marginLeft: 6 }}>
                  {Array.from({ length: Math.min(inscritos, 4) }).map((_, i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '2px solid #fff', marginLeft: -6 }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {inscritos > 4 && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f0f0f0', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid #fff', marginLeft: -6 }}>
                      +{inscritos - 4}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>{inscritos}/{r.max_pessoas}</span>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                {isCriador && (
                  <button onClick={e => cancelarTreino(e, r)} disabled={carregando === r.id} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ffcccc', color: '#cc3333', background: '#fff8f8', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
                    {carregando === r.id ? '...' : 'Cancelar treino'}
                  </button>
                )}
                {isInscrito && (
                  <button onClick={e => sairDoTreino(e, r)} disabled={carregando === r.id} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
                    {carregando === r.id ? '...' : 'Sair'}
                  </button>
                )}
                {!isInscrito && encerrado && (
                  <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 700 }}>Inscrições encerradas. Bom treino! 🏃</span>
                )}
                {!isInscrito && full && !encerrado && (
                  naEspera
                    ? <button onClick={e => sairListaEspera(e, r)} disabled={carregando === r.id + '-espera'} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
                        ✅ Na fila de espera
                      </button>
                    : <button onClick={e => entrarListaEspera(e, r)} disabled={carregando === r.id + '-espera'} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #1D9E75', color: '#1D9E75', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                        🔔 Avisar se abrir vaga
                      </button>
                )}
                {!isInscrito && !full && !encerrado && (
                  <button onClick={e => participar(e, r)} disabled={carregando === r.id} style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #1D9E75', color: '#1D9E75', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                    {carregando === r.id ? 'Aguarde...' : 'Participar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}