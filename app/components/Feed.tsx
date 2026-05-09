'use client'

import { useState, useEffect } from 'react'
import { supabase, Treino } from '../../lib/supabase'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtData(d: string) {
  if (!d) return ''
  const [, m, dia] = d.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(m) - 1]}`
}

const TOM_STYLE: Record<string, { bg: string; color: string }> = {
  'Leve e papo':    { bg: '#E6F1FB', color: '#0C447C' },
  'Focado':         { bg: '#FBEAF0', color: '#72243E' },
  'Qualquer nível': { bg: '#EAF3DE', color: '#27500A' },
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
  const [carregando, setCarregando] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        carregarInscricoes(data.user.id)
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

  async function participar(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    if (!userId) { alert('Faça login para participar!'); return }
    setCarregando(treino.id)

    const { error } = await supabase.from('inscricoes').insert({ treino_id: treino.id, usuario_id: userId })
    if (error) { alert('Erro ao se inscrever: ' + error.message); setCarregando(null); return }

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
    const inscricaoId = inscricoes[treino.id]
    const { error } = await supabase.from('inscricoes').delete().eq('id', inscricaoId)
    if (error) { alert('Erro ao sair: ' + error.message); setCarregando(null); return }
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

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏃</div>
      Carregando treinos...
    </div>
  )

  if (!treinos.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👟</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nenhum treino por aqui ainda.</div>
      <div style={{ fontSize: 13 }}>Crie o primeiro e convide seus amigos!</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0 }}>Perto de você</h2>
        <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{treinos.length} treino{treinos.length !== 1 ? 's' : ''}</span>
      </div>

      {treinos.map((r) => {
        const inscritos = r.inscricoes?.length ?? 0
        const full = inscritos >= r.max_pessoas
        const tom = TOM_STYLE[r.tom] ?? TOM_STYLE['Qualquer nível']
        const isCriador = userId === r.criador_id
        const isInscrito = !!inscricoes[r.id]

        return (
          <div key={r.id} onClick={() => onAbrirChat(r)} style={{ padding: 16, borderBottom: '1px solid #eee', cursor: 'pointer' }}>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#111', marginBottom: 2, lineHeight: 1.2 }}>{r.titulo}</div>
                <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>
                  {isCriador ? '⭐ criado por você' : `por corredor`}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: full ? '#FAEEDA' : '#E1F5EE', color: full ? '#633806' : '#085041', fontWeight: 700 }}>
                  {full ? 'Lotado' : 'Vagas abertas'}
                </span>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: tom.bg, color: tom.color, fontWeight: 600 }}>
                  {r.tom}
                </span>
                {r.aberto_iniciantes && (
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>
                    Iniciantes bem-vindos
                  </span>
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
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
                {!isInscrito && !full && (
                  <button onClick={e => participar(e, r)} disabled={carregando === r.id} style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #1D9E75', color: '#1D9E75', background: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                    {carregando === r.id ? 'Aguarde...' : 'Participar'}
                  </button>
                )}
                {!isInscrito && full && (
                  <button disabled style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #ddd', color: '#ccc', background: 'none', borderRadius: 8, cursor: 'default', fontFamily: "'Barlow', sans-serif" }}>
                    Lista cheia
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