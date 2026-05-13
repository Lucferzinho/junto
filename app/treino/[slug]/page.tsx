'use client' 
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

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

export default function TreinoPublico() {
  const params = useParams()
  const slug = params?.slug as string
  const [treino, setTreino] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!slug) return
    supabase
      .from('treinos')
      .select('*, inscricoes(id), usuarios(nome, avatar_url)')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setTreino(data)
        setLoading(false)
      })
  }, [slug])

  function compartilhar() {
    const url = `https://juntoapp.com.br/treino/${slug}`
    if (navigator.share) {
      navigator.share({ title: treino.titulo, url })
    } else {
      navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', sans-serif", color: '#aaa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏃</div>
        Carregando treino...
      </div>
    </div>
  )

  if (!treino) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow', sans-serif", color: '#aaa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>Treino não encontrado</div>
        <a href="https://juntoapp.com.br" style={{ color: '#1D9E75', fontWeight: 600 }}>Ver outros treinos →</a>
      </div>
    </div>
  )

  const inscritos = treino.inscricoes?.length ?? 0
  const full = inscritos >= treino.max_pessoas
  const tom = TOM_STYLE[treino.tom] ?? TOM_STYLE['Qualquer nível']

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Barlow', sans-serif", padding: '0 0 40px' }}>
      <div style={{ background: '#1D9E75', padding: '20px 20px 32px' }}>
        <a href="https://juntoapp.com.br" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏃</div>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>Junto</span>
        </a>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>{treino.titulo}</h1>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>por {treino.usuarios?.nome || 'Corredor'}</div>
      </div>

      <div style={{ maxWidth: 480, margin: '-16px auto 0', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: full ? '#FAEEDA' : '#E1F5EE', color: full ? '#633806' : '#085041', fontWeight: 700 }}>
              {full ? 'Lotado' : `${inscritos}/${treino.max_pessoas} inscritos`}
            </span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: tom.bg, color: tom.color, fontWeight: 600 }}>{treino.tom}</span>
            {treino.aberto_iniciantes && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>Iniciantes bem-vindos</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {[
              { e: '📅', l: 'Data', v: `${fmtData(treino.data)} às ${treino.horario?.slice(0,5)}` },
              { e: '📍', l: 'Local', v: treino.local },
              { e: '🛣️', l: 'Distância', v: `${treino.km} km` },
              { e: '⚡', l: 'Pace', v: `${treino.pace} /km` },
              { e: '🏃', l: 'Tipo', v: treino.tipo },
            ].map(i => (
              <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{i.e}</span>
                <div>
                  <div style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .3 }}>{i.l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{i.v}</div>
                </div>
              </div>
            ))}
          </div>

          {treino.descricao && (
            <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 16 }}>
              {treino.descricao}
            </div>
          )}

          <a href="https://juntoapp.com.br" style={{ display: 'block', background: '#1D9E75', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>
            {full ? 'Ver lista de espera no app' : 'Participar pelo app →'}
          </a>

          <button onClick={compartilhar} style={{ width: '100%', padding: '11px', border: '1px solid #ddd', borderRadius: 10, fontSize: 14, color: copiado ? '#1D9E75' : '#666', background: copiado ? '#E1F5EE' : '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: "'Barlow', sans-serif" }}>
            {copiado ? '✅ Link copiado!' : '📤 Compartilhar este treino'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#aaa' }}>
          Corra junto. É muito melhor. 🏃<br />
          <a href="https://juntoapp.com.br" style={{ color: '#1D9E75', fontWeight: 600 }}>Criar sua conta no Junto →</a>
        </div>
      </div>
    </div>
  )
}