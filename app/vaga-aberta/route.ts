import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)

export async function POST(req: Request) {
  const { treino_id, titulo, data, horario, local } = await req.json()

  // Busca quem está na lista de espera
  const { data: espera } = await supabase
    .from('lista_espera')
    .select('usuario_id, usuarios(email, nome)')
    .eq('treino_id', treino_id)

  if (!espera || espera.length === 0) return NextResponse.json({ ok: true })

  // Envia email para cada um
  for (const item of espera) {
    const usuario = (item as any).usuarios
    if (!usuario?.email) continue

    await resend.emails.send({
      from: 'Junto <onboarding@resend.dev>',
      to: usuario.email,
      subject: `🔔 Abriu uma vaga! — ${titulo}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#1D9E75;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <h1 style="color:#fff;margin:0;font-size:24px">🏃 Junto</h1>
          </div>
          <h2 style="color:#111;font-size:18px">Olá, ${usuario.nome}! Abriu uma vaga! 🎉</h2>
          <p style="color:#444;line-height:1.6">Uma vaga abriu no treino que você estava esperando:</p>
          <div style="background:#f9f9f9;border-radius:10px;padding:20px;margin:20px 0">
            <h3 style="color:#1D9E75;margin:0 0 12px">${titulo}</h3>
            <p style="margin:4px 0;font-size:13px">📅 ${data} às ${horario}</p>
            <p style="margin:4px 0;font-size:13px">📍 ${local}</p>
          </div>
          <p style="color:#888;font-size:13px">Corre lá antes que feche de novo!</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://juntoapp.com.br" style="background:#1D9E75;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
              Abrir o Junto
            </a>
          </div>
        </div>
      `
    })
  }

  return NextResponse.json({ ok: true })
}