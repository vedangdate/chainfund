import { createContext, useContext, useReducer, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let _id = 0

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload]
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id)
    default:
      return state
  }
}

export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(reducer, [])
  const timers = useRef({})

  const addToast = useCallback((message, type = 'info', txHash = null) => {
    const id = ++_id
    dispatch({ type: 'ADD', payload: { id, message, type, txHash } })
    timers.current[id] = setTimeout(() => {
      dispatch({ type: 'REMOVE', id })
      delete timers.current[id]
    }, 7000)
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
