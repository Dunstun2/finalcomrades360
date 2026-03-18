import React from 'react'
import LoginForm from '../components/auth/LoginForm'
import AuthModal from '../components/auth/AuthModal'

export default function Login() {
  // If visited directly, we still want to show the content, 
  // but since we're using AuthModal now, this page might not be reached 
  // if App.jsx handles the route differently.
  // However, keeping this as a fallback or for direct access is good practice.
  return (
    <div className="md:container px-0 md:px-4 py-8">
      <div className="max-w-md mx-auto md:rounded-lg overflow-hidden border-0 md:border border-gray-100 card">
        <LoginForm />
      </div>
    </div>
  )
}

