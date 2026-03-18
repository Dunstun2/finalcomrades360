import React, { useState } from 'react'
import RegisterForm from '../components/auth/RegisterForm'

export default function Register() {
  const [initialReferralCode, setInitialReferralCode] = useState('')

  // Parse referral code from URL or LocalStorage
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    if (ref) {
      setInitialReferralCode(ref);
      // Ensure it's in local storage too for consistency
      localStorage.setItem('referrerCode', ref);
    } else {
      // Fallback to local storage if not in URL (e.g. user navigated around)
      const storedRef = localStorage.getItem('referrerCode');
      if (storedRef) {
        setInitialReferralCode(storedRef);
      }
    }
  }, []);

  return (
    <div className="md:container px-0 md:px-4 py-8">
      <div className="max-w-md mx-auto md:rounded-lg overflow-hidden border-0 md:border border-gray-100 card">
        <RegisterForm initialReferralCode={initialReferralCode} />
      </div>
    </div>
  )
}
