'use client'

import { useState } from 'react'
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
  const [inscrevendo, setInscrevendo] = useState<string | null>(null)

  async function participar(e: React.MouseEvent, treino: Treino) {
    e.stopPropagation()
    setInscrevendo(treino.id)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Faça login para participar!'); setInscrevendo(null); return }

    // Inscreve no treino
    const { error } = await supabase.from('inscricoes').insert({ treino_id: treino.id, usuario_id: user.id })
    if (error) { alert('Erro ao se inscrever: ' + error.message); setInscrevendo(null); return }

    // Busca dados do usuário para o email
    const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', user.id).single()

    // Envia email de confirmação
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        nome: usuario?.nome || 'Corredor',
        treino: {
          titulo: treino.titulo,
          data: fmtData(treino.data),
          horario: treino.horario?.slice(0, 5),
          local: treino.local,
          km: treino.km,
          pace: treino.pace,
          tom: treino.tom,
        }
      })
    })

    alert('Inscrito! Verifique seu email para os detalhes do treino.')
    onAtualizar()
    setInscrevendo(null)
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🏃</div>
      Carregando treinos...
    </div>
  )

  if (!treinos.length) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👟</div>
      <div style={{ fontSize: 15, marginBottom: 4 }}>Nenhum treino por aqui ainda.</div>
      <div style={{ fontSize: 13 }}>Crie o primeiro e convide seus amigos!</div>
    </div>
  )

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Perto de você</h2>
        <span style={{ fontSize: 12, color: '#888' }}>{treinos.length} treino{treinos.length !== 1 ? 's' : ''}</span>
      </div>

      {treinos.map((r) => {
        const inscritos = r.inscricoes?.length ?? 0
        const full = inscritos >= r.max_pessoas
        const tom = TOM_STYLE[r.tom] ?? TOM_STYLE['Qualquer nível']
        const inits = ['AR','MF','TL','JP'].slice(0, Math.min(inscritos, 4))

        return (
          <div
            key={r.id}
            onClick={() => onAbrirChat(r)}
            style={{ padding: 16, borderBottom: '1px solid #eee', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 2 }}>{r.titulo}</div>
                <div style={{ fontSize: 12, color: '#888' }}>por {r.criador_id?.slice(0, 8)}...</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: full ? '#FAEEDA' : '#E1F5EE', color: full ? '#633806' : '#085041', fontWeight: 500 }}>
                  {full ? 'Lotado' : 'Vagas abertas'}
                </span>
                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: tom.bg, color: tom.color, fontWeight: 500 }}>
                  {r.tom}
                </span>
                {r.aberto_iniciantes && (
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 500 }}>
                    Iniciantes bem-vindos
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {[
                { e: '📅', t: `${fmtData(r.data)} · ${r.horario?.slice(0,5)}` },
                { e: '📍', t: r.local },
                { e: '🛣️', t: `${r.km} km` },
                { e: '⚡', t: `${r.pace} /km` },
              ].map((m) => (
                <span key={m.t} style={{ fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {m.e} {m.t}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', marginLeft: 6 }}>
                {inits.map((init, i) => (
                  <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', color: '#085041', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, border: '2px solid #fff', marginLeft: -6 }}>
                    {init}
                  </div>
                ))}
                {inscritos > 4 && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#f0f0f0', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid #fff', marginLeft: -6 }}>
                    +{inscritos - 4}
                  </div>
                )}
                <span style={{ fontSize: 12, color: '#888', marginLeft: 10, alignSelf: 'center' }}>{inscritos}/{r.max_pessoas}</span>
              </div>
              {full
                ? <button disabled style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #ddd', color: '#ccc', background: 'none', borderRadius: 8, cursor: 'default' }}>Lista cheia</button>
                : <button onClick={(e) => participar(e, r)} disabled={inscrevendo === r.id} style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #1D9E75', color: '#1D9E75', background: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    {inscrevendo === r.id ? 'Inscrevendo...' : 'Participar'}
                  </button>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}