import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import PublicPortfolio from './views/PublicPortfolio'
import PublicReport from './views/PublicReport'

const path = window.location.pathname

// Public portfolio — /p/:slug (no auth, just the artwork)
if (path.startsWith('/p/')) {
  const slug = path.replace('/p/', '').replace(/\/+$/, '')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PublicPortfolio slug={slug} />
    </React.StrictMode>
  )

// Public parent report — /report/:slug (no auth, weekly student summary)
} else if (path.startsWith('/report/')) {
  const slug = path.replace('/report/', '').replace(/\/+$/, '')
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PublicReport slug={slug} />
    </React.StrictMode>
  )

// Everything else — full authenticated app
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
