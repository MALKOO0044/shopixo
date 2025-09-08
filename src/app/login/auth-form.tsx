'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AuthForm() {
  const supabase = createClientComponentClient()
  const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const redirectTo = base ? `${base.replace(/\/$/, '')}/auth/callback` : '/auth/callback'

  return (
    <Auth
      supabaseClient={supabase}
      view="sign_in"
      appearance={{ theme: ThemeSupa }}
      theme="light"
      showLinks={true}
      providers={['google', 'facebook']}
      redirectTo={redirectTo}
    />
  )
}
