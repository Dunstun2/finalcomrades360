import React, { useState } from 'react'

export default function SellerHelp(){
  const [form, setForm] = useState({ subject:'', message:'' })
  const [sent, setSent] = useState(false)

  const submit = (e)=>{
    e.preventDefault()
    // TODO: integrate backend ticket API
    setSent(true)
  }

  return (
    <div className="p-0 sm:p-6 space-y-6 w-full">
      <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">Help & Support</h1>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="font-medium mb-2">FAQs</div>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
            <li>
              <span className="font-medium">How to add a product?</span>
              <div>Go to Products → Add Product. Fill details and media, then Submit for Approval.</div>
            </li>
            <li>
              <span className="font-medium">How do payouts work?</span>
              <div>Payouts are available in Wallet once orders are delivered. Withdraw to M-PESA.</div>
            </li>
            <li>
              <span className="font-medium">Why was my product rejected?</span>
              <div>Check Notifications for reasons. Edit the product and resubmit.</div>
            </li>
          </ul>
        </div>
        <div className="card p-4">
          <div className="font-medium mb-2">Contact Admin</div>
          {sent ? (
            <div className="text-green-700 bg-green-50 border border-green-200 p-3 rounded">Your message has been sent. We'll get back to you.</div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                className="w-full border p-2 rounded"
                placeholder="Subject"
                value={form.subject}
                onChange={(e)=>setForm({...form, subject: e.target.value})}
              />
              <textarea
                className="w-full border p-2 rounded h-28"
                placeholder="Describe your issue"
                value={form.message}
                onChange={(e)=>setForm({...form, message: e.target.value})}
              />
              <button className="px-4 py-2 rounded bg-blue-600 text-white">Send</button>
            </form>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-2">Training Resources</div>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>How to market your products (coming soon)</li>
          <li>Optimizing media for approvals</li>
        </ul>
      </div>
    </div>
  )
}
