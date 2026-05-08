import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Treino = {
  id: string
  criador_id: string
  titulo: string
  data: string
  horario: string
  local: string
  km: number
  pace: string
  tipo: string
  tom: string
  aberto_iniciantes: boolean
  max_pessoas: number
  descricao: string
  status: string
  criado_em: string
  usuarios?: { nome: string; avatar_url: string }
  inscricoes?: { id: string }[]
}

export type Mensagem = {
  id: string
  treino_id: string
  usuario_id: string
  texto: string
  criado_em: string
  usuarios?: { nome: string }
}

export type Usuario = {
  id: string
  nome: string
  email: string
  cidade: string
  pace_medio: string
  nivel: string
  avatar_url: string
}