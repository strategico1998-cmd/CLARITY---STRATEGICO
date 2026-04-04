import { useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = { notifiers: [] }

export function useToast() {
  const [toasts, setToasts] = useState([])
  const timerRef = useRef({})

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    timerRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timerRef.current[id])
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

export function ToastContainer({ toasts, removeToast }) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
