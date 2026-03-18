import React from 'react'

export default function CustomerWallet(){
  const balance = 0
  const txs = [] // TODO: fetch wallet transactions
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Wallet</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-600">Wallet Balance</div>
          <div className="text-2xl font-bold">KES {balance}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">Withdraw</div>
          <button disabled={balance < 100} className={`px-3 py-2 rounded text-white ${balance<100?'bg-gray-400':'bg-green-600'}`}>Withdraw to M-PESA</button>
          <div className="text-xs text-gray-500 mt-1">Minimum withdrawal KES 100</div>
        </div>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Amount</th>
              <th className="text-left py-2 px-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-gray-600">No transactions.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
