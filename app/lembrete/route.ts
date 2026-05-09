import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

export async function POST() {
  const agora = new Date()
  const em1h = new Date(agora.getTime() + 60 * 60 * 1000)
  const em1h15 = new Date(agora.getTime() + 75 * 60 * 1000)

  // Busca treinos que começam entre 1h e 1h15 a partir de agora
  const dataHoje = em1h.toISOString().split('T')[0]
  const horaMin = em1h.toTimeString().slice(0, 5)
  const horaMax = em1h15.toTimeString().slice(0, 5)

  const { data: treinos } = await supabase
    .from('treinos')
    .select('id, titulo, data, horario, local, km, pace, tom')
    .eq('status', 'ativo')
    .eq('data', dataHoje)
    .gte('horario', horaMin)
    .lte('horario', horaMax)

  if (!treinos || treinos.length === 0) return NextResponse.json({ ok: true, enviados: 0 })

  let enviados = 0

  for (const treino of treinos) {
    // Busca inscritos com email
    const { data: inscricoes } = await supabase
      .from('inscricoes')
      .select('usuario_id, usuarios(nome, email)')
      .eq('treino_id', treino.id)

    if (!inscricoes) continue

    for (const i of inscricoes) {
      const usuario = (i as any).usuarios
      if (!usuario?.email) continue

      await resend.emails.send({
        from: 'Junto <onboarding@resend.dev>',
        to: usuario.email,
        subject: `⏰ Lembrete — ${treino.titulo} em 1 hora!`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <div style="background:#1D9E75;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <h1 style="color:#fff;margin:0;font-size:24px">🏃 Junto</h1>
              <p style="color:#E1F5EE;margin:8px 0 0">Corra junto. É muito melhor.</p>
            </div>
            <h2 style="color:#111;font-size:18px">Olá, ${usuario.nome}! O treino é em 1 hora! ⏰</h2>
            <p style="color:#444;line-height:1.6">Não esquece — você está inscrito no treino de hoje:</p>
            <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0">
              <h3 style="color:#1D9E75;margin:0 0 16px;font-size:16px">${treino.titulo}</h3>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:13px">⏰ Horário</td>
                  <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.horario?.slice(0,5)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:13px">📍 Local</td>
                  <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.local}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:13px">🛣️ Distância</td>
                  <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.km} km</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:13px">⚡ Pace</td>
                  <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.pace} /km</td>
                </tr>
              </table>
            </div>
            <p style="color:#444;line-height:1.6">Confirme sua presença no app depois do treino! 💪</p>
            <div style="text-align:center;margin:24px 0">
              <a href="https://juntoapp.com.br" style="background:#1D9E75;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
                Abrir o Junto
              </a>
            </div>
          </div>
        `
      })
      enviados++
    }
  }

  return NextResponse.json({ ok: true, enviados })
}