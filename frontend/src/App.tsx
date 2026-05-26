import './index.css'
import { useState, useEffect, useRef, useCallback } from 'react'

type Page = 'assistant' | 'generate'

const LOADING_TIMEOUT = 15000 // 15秒超时

const LoadingSpinner = () => (
  <div className="loading-container">
    <div className="loading-spinner" />
    <p className="loading-text">正在加载，请稍候...</p>
  </div>
)

const LoadingTimeout = ({ onRetry }: { onRetry: () => void }) => (
  <div className="loading-container">
    <div className="loading-error-icon">!</div>
    <p className="loading-text">加载较慢，请检查网络或点击重试</p>
    <button className="retry-button" onClick={onRetry}>重试</button>
  </div>
)

const ChatbotIframe = ({ src }: { src: string }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isTimeout, setIsTimeout] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLoad = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsLoading(false)
    setIsTimeout(false)
  }, [])

  const handleRetry = useCallback(() => {
    setIsLoading(true)
    setIsTimeout(false)
    setIframeKey(prev => prev + 1)
    timerRef.current = setTimeout(() => {
      setIsTimeout(true)
    }, LOADING_TIMEOUT)
  }, [])

  useEffect(() => {
    setIsLoading(true)
    setIsTimeout(false)
    timerRef.current = setTimeout(() => {
      setIsTimeout(true)
    }, LOADING_TIMEOUT)
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [src, iframeKey])

  return (
    <div className="iframe-wrapper">
      {isLoading && !isTimeout && <LoadingSpinner />}
      {isTimeout && <LoadingTimeout onRetry={handleRetry} />}
      <iframe
        key={iframeKey}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '700px',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
        frameBorder="0"
        allow="microphone"
        onLoad={handleLoad}
      />
    </div>
  )
}

const Header = ({ activePage, onNavigate }: { activePage: Page; onNavigate: (page: Page) => void }) => {
  return (
    <header className="header">
      <div className="header-logo">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="36" height="36" rx="8" fill="url(#gradient)" />
          <path d="M10 12C10 10.8954 10.8954 10 12 10H24C25.1046 10 26 10.8954 26 12V24C26 25.1046 25.1046 26 24 26H12C10.8954 26 10 25.1046 10 24V12Z" fill="white" fillOpacity="0.2" />
          <path d="M13 14H23M13 18H23M13 22H19" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="logo-text">PaperHelper</span>
      </div>
      <nav className="header-nav">
        <button
          className={`nav-tab ${activePage === 'assistant' ? 'active' : ''}`}
          onClick={() => onNavigate('assistant')}
        >
          论文助手
        </button>
        <button
          className={`nav-tab ${activePage === 'generate' ? 'active' : ''}`}
          onClick={() => onNavigate('generate')}
        >
          一键生成论文
        </button>
      </nav>
    </header>
  )
}

const AssistantPage = () => {
  return (
    <div className="assistant-page">
      <ChatbotIframe src="https://udify.app/chatbot/0esZFDM312zviBJL" />
    </div>
  )
}

const GeneratePage = () => {
  return (
    <div className="generate-page">
      <ChatbotIframe src="https://udify.app/chatbot/oXvfxQdSGsKTexdv" />
    </div>
  )
}

const App = () => {
  const [activePage, setActivePage] = useState<Page>('assistant')

  return (
    <div className="app">
      <Header activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content">
        {activePage === 'assistant' ? <AssistantPage /> : <GeneratePage />}
      </main>
    </div>
  )
}

export default App
