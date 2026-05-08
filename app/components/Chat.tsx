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
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    carregarMensagens()

    // Realtime
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

  const inscritos = treino.inscricoes?.length ?? 0

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', display:'flex', flexDirection:'column', background:'#fff' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:10, position:'sticky', top:0, background:'#fff', zIndex:10 }}>
        <button onClick={onVoltar} style={{ background:'none', border:'none', cursor:'pointer', color:'#666', fontSize:22, padding:0, lineHeight:1 }}>←</button>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:'#111' }}>{treino.titulo}</div>
          <div style={{ fontSize:11, color:'#888' }}>{inscritos} participante{inscritos !== 1 ? 's' : ''} · {treino.local}</div>
        </div>
      </div>

      {/* Info */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', padding:'10px 16px', background:'#f9f9f9', borderBottom:'1px solid #eee', gap:4 }}>
        {[
          { l:'Data', v: fmtData(treino.data) },
          { l:'Pace', v: treino.pace },
          { l:'Tom', v: treino.tom },
          { l:'Vagas', v: `${inscritos}/${treino.max_pessoas}` },
        ].map(c => (
          <div key={c.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#aaa', marginBottom:1 }}>{c.l}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#111' }}>{c.v}</div>
          </div>
        ))}
      </div>

      {/* Mensagens */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, minHeight:300 }}>
        {mensagens.length === 0 && (
          <div style={{ textAlign:'center', color:'#aaa', fontSize:13, margin:'auto' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
            Nenhuma mensagem ainda. Seja o primeiro!
          </div>
        )}
        {mensagens.map((m) => {
          const mine = m.usuario_id === userId
          return (
            <div key={m.id} style={{ maxWidth:'78%', alignSelf: mine ? 'flex-end' : 'flex-start', textAlign: mine ? 'right' : 'left' }}>
              {!mine && <div style={{ fontSize:11, color:'#aaa', marginBottom:3 }}>{m.usuarios?.nome ?? 'Corredor'}</div>}
              <div style={{ padding:'8px 12px', borderRadius: mine ? '12px 4px 12px 12px' : '4px 12px 12px 12px', fontSize:13, lineHeight:1.45, background: mine ? '#1D9E75' : '#f0f0f0', color: mine ? '#fff' : '#111' }}>
                {m.texto}
              </div>
              <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>
                {new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'10px 16px', borderTop:'1px solid #eee', display:'flex', gap:8, alignItems:'center', background:'#fff', position:'sticky', bottom:0 }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
          placeholder="Mensagem..."
          style={{ flex:1, padding:'9px 14px', border:'1px solid #ddd', borderRadius:20, fontSize:13, background:'#f9f9f9', color:'#111', outline:'none' }}
        />
        <button onClick={enviar} disabled={enviando} style={{ width:36, height:36, borderRadius:'50%', background:'#1D9E75', border:'none', color:'#fff', cursor:'pointer', fontSize:16, flexShrink:0 }}>
          ➤
        </button>
      </div>
    </div>
  )
}