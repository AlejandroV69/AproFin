import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

// ============================================================
// Autenticación — Supabase Auth
// ============================================================

/**
 * Inicia sesión con email y contraseña.
 * Lanza un error con mensaje legible si las credenciales son incorrectas.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Mensajes de error en español
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Correo o contraseña incorrectos. Verifica tus datos.')
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.')
    }
    throw new Error(error.message)
  }

  if (!data.user || !data.session) {
    throw new Error('Error inesperado al iniciar sesión. Intenta de nuevo.')
  }

  return { user: data.user, session: data.session }
}

/**
 * Cierra la sesión del usuario actual.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/**
 * Obtiene el usuario actualmente autenticado (o null si no hay sesión).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

/**
 * Suscribe un callback a los cambios de estado de autenticación.
 * Retorna la función de cancelación de la suscripción.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const { data: subscription } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session?.user ?? null)
    }
  )
  return () => subscription.subscription.unsubscribe()
}
