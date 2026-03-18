import React, { useEffect, useState } from 'react'
import api from '../../services/api'

export default function SellerNotifications(){
  const [rows,setRows]=useState([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')

  const load=async()=>{
    try{
      const r = await api.get('/notifications/my')
      setRows(r.data||[])
    }catch(e){
      setError(e.response?.data?.error || 'Failed to load notifications')
    }finally{ setLoading(false) }
  }

  useEffect(()=>{ load() },[])

  const markRead=async(id)=>{
    try{
      await api.patch(`/notifications/${id}/read`)
      setRows(prev=> prev.map(n=> n.id===id ? {...n, read:true} : n))
    }catch(e){ /* ignore */ }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      {error && <div className="mb-3 p-3 rounded bg-red-100 text-red-700 text-sm">{error}</div>}
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : rows.length===0 ? (
        <div className="card p-4 text-gray-600">No notifications</div>
      ) : (
        <div className="space-y-2">
          {rows.map(n=> (
            <div key={n.id} className={`border rounded p-3 ${n.read? 'bg-white' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-line">{n.message}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {!n.read && <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">New</span>}
                  {!n.read && <button className="btn" onClick={()=>markRead(n.id)}>Mark read</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
