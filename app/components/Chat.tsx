'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Treino, Mensagem } from '../../lib/supabase'

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtData(d: string) {
  if (!d) return ''
  const [, m, dia] = d.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(m) - 1]}`
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const hoje = new Date().toISOString().split('T')[0]
  const isHoje = treino.data === hoje

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setIsCriador(data.user.id === treino.criador_id)
        verificarInscricao(data.user.id)
        verificarCheckin(data.user.id)
      }
    })
    carregarMensagens()

    const channel = supabase
      .channel('mensagens-' + treino.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `treino_id=eq.${treino.id}` },
        (payload) => setMensagens(prev => [...prev, payload.new as Mensagem])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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

  async function carregarMensagens() {
    const { data } = await supabase
      .from('mensagens')
      .select('*, usuarios(nome)')
      .eq('treino_id', treino.id)
      .order('criado_em', { ascending: true })
    if (data) setMensagens(data)
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
    if (!confirm('Tem certeza que quer cancelar este treino? Ele sumirá do feed para todos.')) return
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

  const inscritos = treino.inscricoes?.length ?? 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', fontFamily: "'Barlow', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={onVoltar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 22, padding: 0, lineHeight: 1 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{treino.titulo}</div>
          <div style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>{inscritos} participante{inscritos !== 1 ? 's' : ''} · {treino.local}</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {isInscrito && (
            <button onClick={sairDoTreino} disabled={saindo} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ddd', color: '#888', background: '#f9f9f9', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {saindo ? '...' : 'Sair'}
            </button>
          )}
          {isCriador && (
            <button onClick={cancelarTreino} disabled={cancelando} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #ffcccc', color: '#cc3333', background: '#fff8f8', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
              {cancelando ? '...' : 'Cancelar treino'}
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

      {/* Banner de check-in — só aparece se o treino for hoje e a pessoa estiver inscrita */}
      {isHoje && isInscrito && (
        <div style={{ padding: '12px 16px', background: checkinFeito ? '#E1F5EE' : '#FFF3E0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: checkinFeito ? '#085041' : '#E65100' }}>
              {checkinFeito ? '✅ Presença confirmada!' : '🔥 O treino é hoje!'}
            </div>
            <div style={{ fontSize: 12, color: checkinFeito ? '#1D9E75' : '#888', marginTop: 2 }}>
              {checkinFeito ? 'Vai aparecer no seu histórico.' : 'Confirme que você foi correr!'}
            </div>
          </div>
          {!checkinFeito && (
            <button onClick={confirmarPresenca} disabled={fazendoCheckin} style={{ fontSize: 13, padding: '7px 16px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, flexShrink: 0, fontFamily: "'Barlow', sans-serif" }}>
              {fazendoCheckin ? '...' : 'Fui correr! ✅'}
            </button>
          )}
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300 }}>
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
              {!mine && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 3, fontWeight: 600 }}>{m.usuarios?.nome ?? 'Corredor'}</div>}
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

      {/* Input */}
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
    </div>
  )
}