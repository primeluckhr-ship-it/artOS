import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PublicPortfolio from './views/PublicPortfolio'

const path = window.location.pathname

// Public portfolio route — no auth, no nav, just the artwork
if (path.startsWith('/p/')) {
  const slug = path.replace('/p/', '').replace(/\/+$/, '')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PublicPortfolio slug={slug} />
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
