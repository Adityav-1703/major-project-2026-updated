/** Lightweight markdown: **bold** and line breaks (no extra npm package). */

function parseInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>
  })
}

export function ChatMessageText({
  content,
  className = '',
}: {
  content: string
  className?: string
}) {
  const lines = content.split('\n')

  return (
    <div className={`space-y-2 text-sm leading-relaxed ${className}`}>
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim()
        if (!trimmed) return <br key={`br-${lineIndex}`} />

        const listMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (listMatch) {
          return (
            <p key={`line-${lineIndex}`} className="pl-1">
              <span className="mr-2 font-medium text-emerald-600 dark:text-emerald-300">
                {listMatch[1]}.
              </span>
              {parseInline(listMatch[2], `l-${lineIndex}`)}
            </p>
          )
        }

        if (trimmed.startsWith('- ')) {
          return (
            <p key={`line-${lineIndex}`} className="pl-3 before:mr-2 before:content-['•']">
              {parseInline(trimmed.slice(2), `l-${lineIndex}`)}
            </p>
          )
        }

        return <p key={`line-${lineIndex}`}>{parseInline(trimmed, `l-${lineIndex}`)}</p>
      })}
    </div>
  )
}
