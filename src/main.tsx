import React from 'react'
import ReactDOM from 'react-dom/client'
// Importamos o componente principal do seu sistema
import App from './App.tsx'
// Importamos o CSS do Tailwind (Isso ativa o visual profissional)
import './index.css'

// O React procura a <div id="root"> no seu index.html e desenha o sistema nela
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)