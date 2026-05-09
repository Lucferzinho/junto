import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, nome, treino } = await req.json()

  const { error } = await resend.emails.send({
    from: 'Junto <onboarding@resend.dev>',
    to: email,
    subject: `✅ Inscrição confirmada — ${treino.titulo}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#1D9E75;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:24px">🏃 Junto</h1>
          <p style="color:#E1F5EE;margin:8px 0 0">Corra junto. É muito melhor.</p>
        </div>

        <h2 style="color:#111;font-size:18px">Olá, ${nome}! Você está dentro! 🎉</h2>
        <p style="color:#444;line-height:1.6">Sua inscrição no treino foi confirmada. Veja os detalhes:</p>

        <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0">
          <h3 style="color:#1D9E75;margin:0 0 16px;font-size:16px">${treino.titulo}</h3>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px">📅 Data</td>
              <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.data} às ${treino.horario}</td>
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
            <tr>
              <td style="padding:6px 0;color:#888;font-size:13px">🎯 Tom</td>
              <td style="padding:6px 0;color:#111;font-size:13px;font-weight:500">${treino.tom}</td>
            </tr>
          </table>
        </div>

        <p style="color:#444;line-height:1.6">Acesse o app para conversar com os outros participantes e combinar os detalhes do percurso.</p>

        <div style="text-align:center;margin:24px 0">
          <a href="https://junto-self.vercel.app" style="background:#1D9E75;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
            Abrir o Junto
          </a>
        </div>

        <p style="color:#aaa;font-size:12px;text-align:center;margin-top:24px">
          Junto — porque correr junto é muito melhor 🏃
        </p>
      </div>
    `
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}