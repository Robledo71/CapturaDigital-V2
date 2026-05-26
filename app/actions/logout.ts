'use server'

import { redirect } from 'next/navigation'
import { deleteSession, getSession } from '@/back/services/session'

export async function logoutUser() {
  const session = await getSession()

  if (session?.refreshToken) {
    try {
      await fetch(`${process.env.QSYNC_API_URL}/qb_sync/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': process.env.X_APP_TOKEN ?? '',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
    } catch {
      // best-effort: siempre se borra la sesión local aunque falle el API
    }
  }

  await deleteSession()
  redirect('/')
}
