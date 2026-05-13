'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Treino, Mensagem } from '../../lib/supabase'

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

function getCountdown(data: string, horario: string) {
  if (!data || !horario) return null
  const treino = new Date(`${data}T${horario}`)
  const agora = new Date()
  const diff = treino.getTime() - agora.getTime()
  if (diff <= 0) return null
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (dias > 0) return `${dias}d ${horas}h ${mins}min`
  if (horas > 0) return `${horas}h ${mins}min`
  return `${mins}min`
}

type Participante = {
  id: string
  nome: string
  avatar_url: string | null
  pace_medio: string | null
  nivel: string | null
  bio: string | null
  cidade: string | null
}

type Props = { treino: Treino; onVoltar: () => void }

export default function Chat({ treino, onVoltar }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [isInscrito, setIsInscrito] = useState(false)
  const [inscricaoId, setInscricaoId] = useState<string | null>(null)
  const [isCriador, setIsCriador] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [checkinFeito, setCheckinFeito] = useState(false)
  const [fazendoCheckin, setFazendoCheckin] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [countdown, setCountdown] = useState<string | null>(null)
  const [avaliacao, setAvaliacao] = useState(0)
  const [avaliacaoFeita, setAvaliacaoFeita] = useState(false)
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [perfilAberto, setPerfilAberto] = useState<Participante | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'chat' | 'participantes'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  const hoje = new Date().toISOString().split('T')[0]
  const isHoje = treino.data === hoje
  const treinoPassou = new Date(`${treino.data}T${treino.horario}`) < new Date()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setIsCriador(data.user.id === treino.criador_id)
        verificarInscricao(data.user.id)
        verificarCheckin(data.user.id)
        verificarAvaliacao(data.user.id)
      }
    })
    carregarMensagens()
    carregarParticipantes()

    const channel = supabase
      .channel('mensagens-' + treino.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `treino_id=eq.${treino.id}` },
        (payload) => setMensagens(prev => [...prev, payload.new as Mensagem])
      )
      .subscribe()

    const timer = setInterval(() => {
      setCountdown(getCountdown(treino.data, treino.horario))
    }, 1000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [treino.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function verificarInscricao(uid: string) {
    const { data } = await supabase.from('inscricoes').select('id').eq('treino_id', treino.id).eq('usuario_id', uid).single()
    if (data) { setIsInscrito(true); setInscricaoId(data.id) }
  }

  async function verificarCheckin(uid: string) {
    const { data } = await supabase.from('checkins').select('id').eq('treino_id', treino.id).eq('usuario_id', uid).single()
    if (data) setCheckinFeito(true)
  }

  async function verificarAvaliacao(uid: string) {
    const { data } = await supabase.from('avaliacoes').select('id').eq('treino_id', treino.id).eq('usuario_id', uid).single()
    if (data) setAvaliacaoFeita(true)
  }

  async function carregarMensagens() {
    const { data } = await supabase
      .from('mensagens')
      .select('*, usuarios(nome)')
      .eq('treino_id', treino.id)
      .order('criado_em', { ascending: true })
    if (data) setMensagens(data)
  }

  async function carregarParticipantes() {
    const { data } = await supabase
      .from('inscricoes')
      .select('usuario_id, usuarios(id, nome, avatar_url, pace_medio, nivel, bio, cidade)')
      .eq('treino_id', treino.id)
    if (data) {
      const ps = data.map((d: any) => d.usuarios).filter(Boolean)
      setParticipantes(ps)
    }
  }

  async function enviar() {
    if (!texto.trim() || enviando) return
    if (!userId) { alert('Faça login para enviar mensagens!'); return }
    setEnviando(true)
    await supabase.from('mensagens').insert({ treino_id: treino.id, usuario_id: userId, texto: texto.trim() })
    setTexto('')
    setEnviando(false)
  }

  async function sairDoTreino() {
    if (!confirm('Tem certeza que quer sair deste treino?')) return
    setSaindo(true)
    const { error } = await supabase.from('inscricoes').delete().eq('id', inscricaoId)
    if (error) { alert('Erro ao sair: ' + error.message); setSaindo(false); return }
    onVoltar()
  }

  async function cancelarTreino() {
    if (!confirm('Tem certeza que quer cancelar este treino?')) return
    setCancelando(true)
    const { error } = await supabase.from('treinos').update({ status: 'cancelado' }).eq('id', treino.id)
    if (error) { alert('Erro ao cancelar: ' + error.message); setCancelando(false); return }
    onVoltar()
  }

  async function confirmarPresenca() {
    if (!userId) return
    setFazendoCheckin(true)
    const { error } = await supabase.from('checkins').insert({ treino_id: treino.id, usuario_id: userId })
    if (error) { alert('Erro ao confirmar: ' + error.message); setFazendoCheckin(false); return }
    setCheckinFeito(true)
    setFazendoCheckin(false)
  }

  async function salvarAvaliacao() {
    if (!userId || avaliacao === 0) return
    setSalvandoAvaliacao(true)
    const { error } = await supabase.from('avaliacoes').insert({ treino_id: treino.id, usuario_id: userId, nota: avaliacao })
    if (error) { alert('Erro ao avaliar: ' + error.message); setSalvandoAvaliacao(false); return }
    setAvaliacaoFeita(true)
    setSalvandoAvaliacao(false)
  }

  function compartilhar() {
    const slug = (treino as any).slug
    const url = slug ? `https://juntoapp.com.br/treino/${slug}` : 'https://juntoapp.com.br'
    const txt = `🏃 ${treino.titulo}\n📅 ${fmtData(treino.data)} às ${treino.horario?.slice(0,5)}\n📍 ${treino.local}\n🛣️ ${treino.km} km · ${treino.pace} /km\n\nVem correr junto! 👉 ${url}`
    if (navigator.share) {
      navigator.share({ title: treino.titulo, text: txt, url })
    } else {
      navigator.clipboard.writeText(txt)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const inscritos = treino.inscricoes?.length ?? 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: "'Barlow', sans-serif" }}>

      {/* Mini perfil modal */}
      {perfilAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setPerfilAberto(null)}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              {perfilAberto.avatar_url
                ? <img src={perfilAberto.avatar_url} alt={perfilAberto.nome} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(perfilAberto.nome)}</div>
              }
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111' }}>{perfilAberto.nome}</div>
                {perfilAberto.cidade && <div style={{ fontSize: 13, color: '#888' }}>📍 {perfilAberto.cidade}</div>}
              </div>
            </div>
            {perfilAberto.bio && <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 12 }}>"{perfilAberto.bio}"</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              {perfilAberto.pace_medio && (
                <div style={{ flex: 1, background: '#f9f9f9', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1D9E75' }}>{perfilAberto.pace_medio}</div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>Pace médio</div>
                </div>
              )}
              {perfilAberto.nivel && (
                <div style={{ flex: 1, background: '#f9f9f9', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1D9E75', textTransform: 'capitalize' }}>{perfilAberto.nivel}</div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>Nível</div>
                </div>
              )}
            </div>
            <button onClick={() => setPerfilAberto(null)} style={{ width: '100%', marginTop: 16, padding: 11, border: '1px solid #eee', borderRadius: 8, fontSize: 14, color: '#888', background: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontWeight: 600 }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={onVoltar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 22, padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{treino.titulo}</div>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>{inscritos} participante{inscritos !== 1 ? 's' : ''} · {treino.local}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={compartilhar} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ddd', color: copiado ? '#1D9E75' : '#888', background: copiado ? '#E1F5EE' : '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
            {copiado ? '✅' : '📤'}
          </button>
          {isInscrito && (
            <button onClick={sairDoTreino} disabled={saindo} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {saindo ? '...' : 'Sair'}
            </button>
          )}
          {isCriador && (
            <button onClick={cancelarTreino} disabled={cancelando} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ffcccc', color: '#cc3333', background: '#fff8f8', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {cancelando ? '...' : 'Cancelar'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '10px 16px', background: '#f9f9f9', borderBottom: '1px solid #eee', gap: 4 }}>
        {[
          { l: 'Data', v: fmtData(treino.data) },
          { l: 'Pace', v: treino.pace },
          { l: 'Tom', v: treino.tom },
          { l: 'Vagas', v: `${inscritos}/${treino.max_pessoas}` },
        ].map(c => (
          <div key={c.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#aaa', marginBottom: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>{c.l}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Countdown */}
      {countdown && !treinoPassou && (
        <div style={{ padding: '10px 16px', background: '#F0FDF9', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#1D9E75', fontWeight: 700 }}>⏱ Começa em {countdown}</span>
        </div>
      )}

      {/* Banner check-in */}
      {isHoje && isInscrito && (
        <div style={{ padding: '12px 16px', background: checkinFeito ? '#E1F5EE' : '#FFF3E0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: checkinFeito ? '#085041' : '#E65100' }}>
              {checkinFeito ? '✅ Presença confirmada!' : '🔥 O treino é hoje!'}
            </div>
            <div style={{ fontSize: 12, color: checkinFeito ? '#1D9E75' : '#888', marginTop: 2 }}>
              {checkinFeito ? 'Arrasou! 💪' : 'Confirme que você foi correr!'}
            </div>
          </div>
          {!checkinFeito && (
            <button onClick={confirmarPresenca} disabled={fazendoCheckin} style={{ fontSize: 13, padding: '7px 16px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, flexShrink: 0, fontFamily: "'Barlow', sans-serif" }}>
              {fazendoCheckin ? '...' : 'Fui correr! ✅'}
            </button>
          )}
        </div>
      )}

      {/* Avaliação */}
      {checkinFeito && !avaliacaoFeita && (
        <div style={{ padding: '12px 16px', background: '#F8F8F8', borderBottom: '1px solid #eee' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 8 }}>⭐ Como foi o treino?</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setAvaliacao(n)} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', opacity: avaliacao >= n ? 1 : 0.3, transition: 'opacity .15s' }}>⭐</button>
            ))}
            {avaliacao > 0 && (
              <button onClick={salvarAvaliacao} disabled={salvandoAvaliacao} style={{ marginLeft: 8, fontSize: 12, padding: '5px 14px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontFamily: "'Barlow', sans-serif" }}>
                {salvandoAvaliacao ? '...' : 'Enviar'}
              </button>
            )}
          </div>
        </div>
      )}
      {avaliacaoFeita && checkinFeito && (
        <div style={{ padding: '10px 16px', background: '#F0FDF9', borderBottom: '1px solid #eee', fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>
          ✅ Avaliação enviada! Obrigado pelo feedback.
        </div>
      )}

      {/* Abas chat / participantes */}
      <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
        {[
          { id: 'chat', label: '💬 Chat' },
          { id: 'participantes', label: `👟 Participantes (${participantes.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id as any)} style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: abaAtiva === a.id ? 700 : 500, color: abaAtiva === a.id ? '#1D9E75' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${abaAtiva === a.id ? '#1D9E75' : 'transparent'}`, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Aba participantes */}
      {abaAtiva === 'participantes' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {participantes.map(p => (
            <div key={p.id} onClick={() => setPerfilAberto(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#f9f9f9', borderRadius: 10, cursor: 'pointer' }}>
              {p.avatar_url
                ? <img src={p.avatar_url} alt={p.nome} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E1F5EE', color: '#085041', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials(p.nome)}</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {p.pace_medio && `⚡ ${p.pace_medio} /km`}
                  {p.nivel && ` · ${p.nivel}`}
                </div>
              </div>
              <span style={{ fontSize: 18, color: '#ccc' }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* Aba chat */}
      {abaAtiva === 'chat' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 200 }}>
            {mensagens.length === 0 && (
              <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, margin: 'auto' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                Nenhuma mensagem ainda. Seja o primeiro!
              </div>
            )}
            {mensagens.map((m) => {
              const mine = m.usuario_id === userId
              return (
                <div key={m.id} style={{ maxWidth: '78%', alignSelf: mine ? 'flex-end' : 'flex-start', textAlign: mine ? 'right' : 'left' }}>
                  {!mine && (
                    <div onClick={() => { const p = participantes.find(x => x.id === m.usuario_id); if (p) setPerfilAberto(p) }} style={{ fontSize: 11, color: '#1D9E75', marginBottom: 3, fontWeight: 600, cursor: 'pointer' }}>
                      {m.usuarios?.nome ?? 'Corredor'}
                    </div>
                  )}
                  <div style={{ padding: '8px 12px', borderRadius: mine ? '12px 4px 12px 12px' : '4px 12px 12px 12px', fontSize: 14, fontWeight: 500, lineHeight: 1.45, background: mine ? '#1D9E75' : '#f0f0f0', color: mine ? '#fff' : '#111' }}>
                    {m.texto}
                  </div>
                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 3, fontWeight: 500 }}>
                    {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center', background: '#fff', position: 'sticky', bottom: 0 }}>
            <input
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Mensagem..."
              style={{ flex: 1, padding: '9px 14px', border: '1px solid #ddd', borderRadius: 20, fontSize: 14, fontWeight: 500, background: '#f9f9f9', color: '#111', outline: 'none', fontFamily: "'Barlow', sans-serif" }}
            />
            <button onClick={enviar} disabled={enviando} style={{ width: 36, height: 36, borderRadius: '50%', background: '#1D9E75', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>
              ➤
            </button>
          </div>
        </>
      )}
    </div>
  )
}