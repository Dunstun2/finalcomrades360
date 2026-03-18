import React from 'react'

export default function CustomerAddresses(){
  const addresses = [] // TODO: load from /my/addresses
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Addresses</h2>
      <div className="card p-4">
        <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Add Address</button>
      </div>
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="card p-6 text-center text-gray-600">No addresses saved.</div>
        ) : addresses.map(addr => (
          <div key={addr.id} className="card p-4">
            <div className="font-medium">{addr.name} — {addr.phone}</div>
            <div className="text-sm text-gray-600">{addr.location} — {addr.details}</div>
            <div className="mt-2 flex gap-2">
              <button className="px-3 py-1.5 rounded border">Set Default</button>
              <button className="px-3 py-1.5 rounded border">Edit</button>
              <button className="px-3 py-1.5 rounded border text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
