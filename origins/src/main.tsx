import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress unhandled rejection from sqlite-wasm-http when it receives a null message (library quirk).
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message === 'sqlite3Worker1Promiser: null message') {
    event.preventDefault()
    event.stopPropagation()
  }
})

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <App />
)
