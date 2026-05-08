'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const PACES = ['4:00–4:30','4:30–5:00','5:00–5:30','5:30–6:00','6:00–6:30','6:30+']
const TOMS = ['Leve e papo','Focado','Qualquer nível']
const TIPOS = ['Long run','Intervalado','Progressivo','Tempo run','Regenerativo','Corrida livre']

const TOM_SEL: Record<string, { bg: string; color: string; border: string }> = {
  'Leve e papo':    { bg: '#E6F1FB', color: '#0C447C', border: '#185FA5' },
  'Focado':         { bg: '#FBEAF0', color: '#72243E', border: '#993556' },
  'Qualquer nível': { bg: '#EAF3DE', color: '#27500A', border: '#3B6D11' },
}

type Props = { onCriado: () => void }

export default function CriarTreino({ onCriado }: Props) {
  const [form, setForm] = useState({
    titulo: '', data: '', horario: '06:30', local: '',
    km: '', max: '10', tipo: 'Long run',
    pace: '5:00–5:30', tom: 'Leve e papo',
    iniciantes: true, descricao: ''
  })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function publicar() {
    if (!form.titulo || !form.data || !form.local) {
      alert('Preencha pelo menos o nome, a data e o local.')
      return
    }
    setSalvando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Faça login para criar um treino!'); setSalvando(false); return }

    const { error } = await supabase.from('treinos').insert({
      criador_id: user.id,
      titulo: form.titulo,
      data: form.data,
      horario: form.horario,
      local: form.local,
      km: parseInt(form.km) || 5,
      max_pessoas: parseInt(form.max) || 10,
      tipo: form.tipo,
      pace: form.pace,
      tom: form.tom,
      aberto_iniciantes: form.iniciantes,
      descricao: form.descricao,
      status: 'ativo'
    })

    setSalvando(false)
    if (error) { alert('Erro ao publicar: ' + error.message); return }

    setSucesso(true)
    setForm({ titulo:'', data:'', horario:'06:30', local:'', km:'', max:'10', tipo:'Long run', pace:'5:00–5:30', tom:'Leve e papo', iniciantes:true, descricao:'' })
    setTimeout(() => { setSucesso(false); onCriado() }, 1500)
  }

  const inp = { width:'100%', padding:'9px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, background:'#fff', color:'#111', outline:'none', fontFamily:'inherit' } as React.CSSProperties
  const lbl = { fontSize:12, color:'#666', display:'block', marginBottom:5 } as React.CSSProperties

  return (
    <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
      {sucesso && (
        <div style={{ background:'#E1F5EE', color:'#085041', borderRadius:10, padding:'12px 16px', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
          ✅ Treino publicado! Aparecendo no feed.
        </div>
      )}

      <div><label style={lbl}>Nome do treino *</label><input style={inp} placeholder="Ex: Long run de sábado" value={form.titulo} onChange={e => set('titulo', e.target.value)} /></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div><label style={lbl}>Data *</label><input type="date" style={inp} value={form.data} onChange={e => set('data', e.target.value)} /></div>
        <div><label style={lbl}>Horário</label><input type="time" style={inp} value={form.horario} onChange={e => set('horario', e.target.value)} /></div>
      </div>

      <div><label style={lbl}>Local de saída *</label><input style={inp} placeholder="Ex: Aterro do Flamengo" value={form.local} onChange={e => set('local', e.target.value)} /></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div><label style={lbl}>Distância (km)</label><input type="number" min="1" style={inp} placeholder="18" value={form.km} onChange={e => set('km', e.target.value)} /></div>
        <div><label style={lbl}>Máx. de pessoas</label><input type="number" min="2" style={inp} value={form.max} onChange={e => set('max', e.target.value)} /></div>
      </div>

      <div>
        <label style={lbl}>Tipo de treino</label>
        <select style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          {TIPOS.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label style={lbl}>Pace estimado do grupo</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {PACES.map(p => (
            <button key={p} onClick={() => set('pace', p)} style={{ padding:'6px 13px', borderRadius:20, border:`1px solid ${form.pace===p ? '#1D9E75' : '#ddd'}`, background: form.pace===p ? '#E1F5EE' : '#fff', color: form.pace===p ? '#085041' : '#666', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={lbl}>Tom do treino</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {TOMS.map(t => {
            const s = TOM_SEL[t]
            const sel = form.tom === t
            return (
              <button key={t} onClick={() => set('tom', t)} style={{ padding:'6px 13px', borderRadius:20, border:`1px solid ${sel ? s.border : '#ddd'}`, background: sel ? s.bg : '#fff', color: sel ? s.color : '#666', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:'#111' }}>Aberto a iniciantes</div>
          <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Aparece com o selo no feed</div>
        </div>
        <div onClick={() => set('iniciantes', !form.iniciantes)} style={{ width:36, height:20, background: form.iniciantes ? '#1D9E75' : '#ddd', borderRadius:20, position:'relative', cursor:'pointer', transition:'background .2s' }}>
          <div style={{ position:'absolute', width:14, height:14, background:'#fff', borderRadius:'50%', top:3, left: form.iniciantes ? 19 : 3, transition:'left .2s' }} />
        </div>
      </div>

      <div><label style={lbl}>Descrição do percurso</label><textarea rows={3} style={{ ...inp, resize:'vertical' }} placeholder="Descreva o trajeto, pontos de parada, estratégia..." value={form.descricao} onChange={e => set('descricao', e.target.value)} /></div>

      <button onClick={publicar} disabled={salvando} style={{ background: salvando ? '#ccc' : '#1D9E75', color:'#fff', border:'none', borderRadius:8, padding:13, fontSize:15, cursor: salvando ? 'not-allowed' : 'pointer', fontWeight:600, fontFamily:'inherit' }}>
        {salvando ? 'Publicando...' : '🏃 Publicar treino'}
      </button>
    </div>
  )
}