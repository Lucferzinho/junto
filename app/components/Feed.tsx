'use client'

import { useState, useEffect } from 'react'
import { supabase, Treino } from '../../lib/supabase'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

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

function diaSemana(data: string) {
  if (!data) return -1
  return new Date(data + 'T12:00:00').getDay()
}

function isHoje(data: string) {
  return data === new Date().toISOString().split('T')[0]
}

function isAmanha(data: string) {
  const amanha = new Date()
  amanha.setDate(amanha.getDate() + 1)
  return data === amanha.toISOString().split('T')[0]
}

const TOM_STYLE: Record<string, { bg: string; color: string }> = {
  'Leve e papo':    { bg: '#E6F1FB', color: '#0C447C' },
  'Focado':         { bg: '#FBEAF0', color: '#72243E' },
  'Qualquer nível': { bg: '#EAF3DE', color: '#27500A' },
}

const TIPOS = ['Long run','Intervalado','Progressivo','Tempo run','Regenerativo','Corrida livre']
const TOMS = ['Leve e papo','Focado','Qualquer nível']
const PACES = ['4:00–4:30','4:30–5:00','5:00–5:30','5:30–6:00','6:00–6:30','6:30+']

const CLIMA_ICONS: Record<string, string> = {
  '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
  '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
  '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
  '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
  '50d': '🌫️', '50n': '🌫️',
}

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
  const [climas, setClimas] = useState<Record<string, any>>({})

  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroTom, setFiltroTom] = useState('')
  const [filtroPace, setFiltroPace] = useState('')
  const [filtroLocal, setFiltroLocal] = useState('')
  const [filtroDia, setFiltroDia] = useState<number | null>(null)
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

  useEffect(() => {
    // Busca clima para treinos de hoje e amanhã
    treinos.forEach(r => {
      if ((isHoje(r.data) || isAmanha(r.data)) && !climas[r.id]) {
        buscarClima(r)
      }
    })
  }, [treinos])

  async function buscarClima(treino: Treino) {
    const key = process.env.NEXT_PUBLIC_OPENWEATHER_KEY
    if (!key || !treino.local) return
    try {
      const geo = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(treino.local)},BR&limit=1&appid=${key}`)
      const geoData = await geo.json()
      if (!geoData[0]) return
      const { lat, lon } = geoData[0]
      const weather = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=pt_br`)
      const wData = await weather.json()
      setClimas(prev => ({ ...prev, [treino.id]: wData }))
    } catch {}
  }

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
    if (!confirm('Tem certeza que quer cancelar este treino?')) return
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

  function limparFiltros() {
    setFiltroTipo(''); setFiltroTom(''); setFiltroPace('')
    setFiltroLocal(''); setFiltroDia(null); setFiltroIniciantes(false)
  }

  const treinosFiltrados = treinos.filter(r => {
    if (filtroTipo && r.tipo !== filtroTipo) return false
    if (filtroTom && r.tom !== filtroTom) return false
    if (filtroPace && r.pace !== filtroPace) return false
    if (filtroLocal && !r.local.toLowerCase().includes(filtroLocal.toLowerCase())) return false
    if (filtroDia !== null && diaSemana(r.data) !== filtroDia) return false
    if (filtroIniciantes && !r.aberto_iniciantes) return false
    return true
  })

  const temFiltroAtivo = filtroTipo || filtroTom || filtroPace || filtroLocal || filtroDia !== null || filtroIniciantes

  const pill = (label: string, ativo: boolean, onClick: () => void, bg?: string, color?: string) => (
    <button onClick={onClick} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${ativo ? (color || '#1D9E75') : '#ddd'}`, background: ativo ? (bg || '#E1F5EE') : '#fff', color: ativo ? (color || '#085041') : '#666', cursor: 'pointer', fontWeight: ativo ? 700 : 500, fontFamily: "'Barlow', sans-serif" }}>
      {label}
    </button>
  )

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏃</div>Carregando treinos...
    </div>
  )

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: mostrarFiltros ? 14 : 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Perto de você</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{treinosFiltrados.length} treino{treinosFiltrados.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)} style={{ fontSize: 12, padding: '4px 12px', border: `1px solid ${temFiltroAtivo ? '#1D9E75' : '#ddd'}`, color: temFiltroAtivo ? '#1D9E75' : '#888', background: temFiltroAtivo ? '#E1F5EE' : '#fff', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {temFiltroAtivo ? '🔍 Ativos' : '🔍 Filtrar'}
            </button>
          </div>
        </div>

        {mostrarFiltros && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Localização</div>
              <input value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)} placeholder="Ex: Aterro, Ipanema, Lagoa..." style={{ width: '100%', padding: '7px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: "'Barlow', sans-serif", boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Dia da semana</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIAS_SEMANA.map((d, i) => pill(d, filtroDia === i, () => setFiltroDia(filtroDia === i ? null : i)))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Pace</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PACES.map(p => pill(p, filtroPace === p, () => setFiltroPace(filtroPace === p ? '' : p)))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Tipo de treino</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TIPOS.map(t => pill(t, filtroTipo === t, () => setFiltroTipo(filtroTipo === t ? '' : t)))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 }}>Tom do treino</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TOMS.map(t => { const s = TOM_STYLE[t]; return pill(t, filtroTom === t, () => setFiltroTom(filtroTom === t ? '' : t), s.bg, s.color) })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Só abertos a iniciantes</span>
              <div onClick={() => setFiltroIniciantes(!filtroIniciantes)} style={{ width: 36, height: 20, background: filtroIniciantes ? '#1D9E75' : '#ddd', borderRadius: 20, position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                <div style={{ position: 'absolute', width: 14, height: 14, background: '#fff', borderRadius: '50%', top: 3, left: filtroIniciantes ? 19 : 3, transition: 'left .2s' }} />
              </div>
            </div>
            {temFiltroAtivo && (
              <button onClick={limparFiltros} style={{ fontSize: 12, color: '#cc3333', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left', padding: 0, fontFamily: "'Barlow', sans-serif" }}>
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
          <div style={{ fontSize: 13 }}>Tenta ajustar ou cria um treino!</div>
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
        const hoje = isHoje(r.data)
        const amanha = isAmanha(r.data)
        const encerrado = inscricoesEncerradas(r.data, r.horario)
        const clima = climas[r.id]

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
                  <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{isCriador ? '⭐ criado por você' : `por ${nomeHost}`}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                {hoje && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#FFF3E0', color: '#E65100', fontWeight: 700 }}>🔥 Hoje!</span>}
                {amanha && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#F3E5F5', color: '#6A1B9A', fontWeight: 700 }}>📅 Amanhã</span>}
                {encerrado
                  ? <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#f0f0f0', color: '#888', fontWeight: 700 }}>Inscrições encerradas</span>
                  : <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: full ? '#FAEEDA' : '#E1F5EE', color: full ? '#633806' : '#085041', fontWeight: 700 }}>{full ? 'Lotado' : 'Vagas abertas'}</span>
                }
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: tom.bg, color: tom.color, fontWeight: 600 }}>{r.tom}</span>
                {r.aberto_iniciantes && <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>Iniciantes bem-vindos</span>}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {[
                { e: '📅', t: `${fmtData(r.data)} · ${r.horario?.slice(0,5)}` },
                { e: '📍', t: r.local },
                { e: '🛣️', t: `${r.km} km` },
                { e: '⚡', t: `${r.pace} /km` },
              ].map((m) => (
                <span key={m.t} style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'flex', alignItems: 'center', gap: 4 }}>{m.e} {m.t}</span>
              ))}
            </div>

            {/* Clima */}
            {clima && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f9f9f9', borderRadius: 8, marginBottom: 10, fontSize: 12, color: '#555', fontWeight: 600 }}>
                <span style={{ fontSize: 18 }}>{CLIMA_ICONS[clima.weather?.[0]?.icon] || '🌡️'}</span>
                <span>{Math.round(clima.main?.temp)}°C · {clima.weather?.[0]?.description}</span>
                {clima.main?.humidity && <span style={{ color: '#aaa' }}>💧 {clima.main.humidity}%</span>}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', marginLeft: 6 }}>
                  {Array.from({ length: Math.min(inscritos, 4) }).map((_, i) => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '2px solid #fff', marginLeft: -6 }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {inscritos > 4 && <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f0f0f0', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid #fff', marginLeft: -6 }}>+{inscritos - 4}</div>}
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
                {!isInscrito && encerrado && <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 700 }}>Inscrições encerradas. Bom treino! 🏃</span>}
                {!isInscrito && full && !encerrado && (
                  naEspera
                    ? <button onClick={e => sairListaEspera(e, r)} disabled={carregando === r.id + '-espera'} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>✅ Na fila de espera</button>
                    : <button onClick={e => entrarListaEspera(e, r)} disabled={carregando === r.id + '-espera'} style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #1D9E75', color: '#1D9E75', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>🔔 Avisar se abrir vaga</button>
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