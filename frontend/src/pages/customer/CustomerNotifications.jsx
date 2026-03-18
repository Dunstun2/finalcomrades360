import React, { useEffect, useState } from 'react'
import api from '../../services/api'

export default function CustomerNotifications(){
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
          {rows.map(n=> {
            const typeColors = {
              info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', icon: 'text-blue-600' },
              success: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-600', icon: 'text-green-600' },
              warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-600', icon: 'text-yellow-600' },
              alert: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-600', icon: 'text-red-600' }
            };
            const colors = typeColors[n.type] || typeColors.info;
            
            return (
              <div key={n.id} className={`border-2 rounded-lg p-4 ${n.read ? 'bg-white border-gray-200' : `${colors.bg} ${colors.border}`}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Icon based on type */}
                      {n.type === 'success' && (
                        <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {n.type === 'warning' && (
                        <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      {n.type === 'alert' && (
                        <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {(!n.type || n.type === 'info') && (
                        <svg className={`w-5 h-5 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <div className="font-semibold text-gray-900">{n.title}</div>
                      {!n.read && <span className={`text-xs px-2 py-1 rounded ${colors.badge} text-white font-medium`}>New</span>}
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-line mb-2">{n.message}</div>
                    <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {!n.read && (
                      <button 
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        onClick={()=>markRead(n.id)}
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
