import {Auth} from '@supabase/auth-ui-react'
import {createClient} from '@supabase/supabase-js'
import React from 'react'

import {Container} from '@usevenice/ui'

import {Layout} from '../components/Layout'

// https://app.supabase.com/project/hhnxsazpojeczkeeifli/settings/api
const supabase = createClient(
  'https://hhnxsazpojeczkeeifli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobnhzYXpwb2plY3prZWVpZmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjAyNjgwOTIsImV4cCI6MTk3NTg0NDA5Mn0.ZDmf1sjsr-UxW2bPgdj3uaqJNUSqkZh8vCB1phn3qqs',
)

function AuthComponent() {
  const {user, session} = Auth.useUser()
  console.log('AuthComp', {user, session})

  if (user) {
    return (
      <div>
        <div>
          You are logged in as {user.email} id: {user.id}
        </div>
        <button
          onClick={() => {
            supabase.auth.signOut()
          }}>
          Log out
        </button>
      </div>
    )
  }
  return (
    <Auth
      supabaseClient={supabase}
      providers={['apple', 'google', 'facebook', 'github']}></Auth>
  )
}

export default function AuthScreen() {
  return (
    <Auth.UserContextProvider supabaseClient={supabase}>
      <Layout>
        <Container className="flex-1">
          <AuthComponent />
        </Container>
      </Layout>
    </Auth.UserContextProvider>
  )
}
