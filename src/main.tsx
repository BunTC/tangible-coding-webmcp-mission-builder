import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LessonStoreProvider } from './state/lesson-store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LessonStoreProvider>
      <App />
    </LessonStoreProvider>
  </StrictMode>,
)
