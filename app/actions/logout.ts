'use server'

import { redirect } from 'next/navigation'
import { deleteSession } from '@/back/services/session'

export async function logoutUser() {
  await deleteSession()
  redirect('/')
}
