'use client'

import { useState, useEffect } from 'react'
import { supabase, Treino } from '../lib/supabase'
import Feed from './components/Feed'
import CriarTreino from './components/CriarTreino'
import Perfil from './components/Perfil'
import Chat from './components/Chat'

export default function Home() {
  const [tab, setTab] = useState<'feed' | 'criar' | 'perfil'>('feed')
  const [chatTreino, setChatTreino] = useState<Treino | null>(null)
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarTreinos()
  }, [])

  async function carregarTreinos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('treinos')
      .select('*, inscricoes(id), usuarios(nome, avatar_url)')
      .eq('status', 'ativo')
      .order('data', { ascending: true })
    if (!error && data) setTreinos(data)
    setLoading(false)
    return true
  }

  function abrirChat(treino: Treino) {
    setChatTreino(treino)
  }

  function fecharChat() {
    setChatTreino(null)
    carregarTreinos()
  }

  if (chatTreino) {
    return <Chat treino={chatTreino} onVoltar={fecharChat} />
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16 }}>🏃</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#111', fontFamily: "'Barlow', sans-serif" }}>Junto</span>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #eee', position: 'sticky', top: 57, background: '#fff', zIndex: 9 }}>
        {[
          { id: 'feed', label: 'Treinos', emoji: '📋' },
          { id: 'criar', label: 'Criar', emoji: '➕' },
          { id: 'perfil', label: 'Perfil', emoji: '👤' },
        ].map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id as any)}
            style={{ flex: 1, padding: '10px 4px', fontSize: 12, color: tab === n.id ? '#1D9E75' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${tab === n.id ? '#1D9E75' : 'transparent'}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: "'Barlow', sans-serif" }}
          >
            <span style={{ fontSize: 18 }}>{n.emoji}</span>
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'feed' && (
          <Feed treinos={treinos} loading={loading} onAbrirChat={abrirChat} onAtualizar={carregarTreinos} />
        )}
        {tab === 'criar' && (
          <CriarTreino onCriado={() => { carregarTreinos(); setTab('feed') }} />
        )}
        {tab === 'perfil' && <Perfil />}
      </div>
    </div>
  )
}