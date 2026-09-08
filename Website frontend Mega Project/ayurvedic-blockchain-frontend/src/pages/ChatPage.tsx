import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import {
  Send,
  Bot,
  User,
  LogOut,
  ArrowLeft,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { sendChatMessage } from '@/lib/api'
import { ChatMessageText } from '@/components/ChatMessageText'
import {
  CHATBOT_WELCOME,
  buildChatHistory,
  finalizeChatReply,
  getLocalChatReply,
} from '@/lib/chatbot'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    content: CHATBOT_WELCOME,
  },
]

const quickReplies = [
  'How do I scan a pack I bought?',
  'How does AI authenticity work?',
  'Where do I browse verified herbs?',
  'What is My checks?',
]

export default function ChatPage() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Load chat history from localStorage
  useEffect(() => {
    if (user?.email) {
      const saved = localStorage.getItem(`ayurauth-chat-${user.email}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed)
          }
        } catch {
          // Use default messages
        }
      }
    }
  }, [user?.email])

  // Save chat history to localStorage
  useEffect(() => {
    if (user?.email && messages.length > 1) {
      localStorage.setItem(`ayurauth-chat-${user.email}`, JSON.stringify(messages))
    }
  }, [messages, user?.email])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim()) return
    const text = inputValue.trim()
    setInputValue('')
    await sendText(text)
  }

  const sendText = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }

    const history = buildChatHistory(messages)
    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    let reply = getLocalChatReply(text)
    try {
      const { reply: apiReply } = await sendChatMessage(text, history)
      reply = finalizeChatReply(text, apiReply)
    } catch {
      reply = finalizeChatReply(text, getLocalChatReply(text))
    }

    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      },
    ])
    setIsTyping(false)
  }

  const handleQuickReply = (reply: string) => {
    void sendText(reply)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const clearChat = () => {
    setMessages(initialMessages)
    if (user?.email) {
      localStorage.removeItem(`ayurauth-chat-${user.email}`)
    }
  }

  const copyChat = () => {
    const text = messages
      .map((m) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    setShowCopyConfirm(true)
    setTimeout(() => setShowCopyConfirm(false), 2000)
  }

  const exportChat = () => {
    const text = messages
      .map((m) => `[${new Date(m.timestamp).toLocaleString()}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ayurauth-chat-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-slate-900 dark:mesh-bg dark:text-white">
      <div className="noise-overlay fixed inset-0 z-[1] hidden dark:block" aria-hidden />
      <div className="relative z-10 mx-auto flex h-screen max-w-4xl flex-col px-4 py-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl border border-border/20 bg-card/50 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-full p-2 text-slate-600 hover:text-slate-900 hover:bg-muted dark:text-white/70 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">AyurAuth AI</h2>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Information only • {user?.name} • {messages.length} messages
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="glass" size="sm" onClick={copyChat} className="gap-1.5">
              {showCopyConfirm ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="glass" size="sm" onClick={exportChat} className="gap-1.5">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="sm" onClick={clearChat} className="gap-1.5">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-border/20 bg-card/30 p-4 backdrop-blur-sm">
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-5 w-5 text-white" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ChatMessageText content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  )}
                  <p
                    className={`mt-1 text-xs ${
                      message.role === 'user' ? 'text-white/60' : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Replies */}
        <div className="mt-3 px-1">
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => handleQuickReply(reply)}
                className="rounded-full border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/20 bg-card/50 px-4 py-3 backdrop-blur-xl">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button
            onClick={handleSend}
            size="sm"
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}