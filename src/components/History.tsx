import type { AngleMode } from '../lib/engine'

export interface HistoryItem {
  id: string
  expr: string
  result: string
  value: number
  angle: AngleMode
  ts: number
}

interface Props {
  items: HistoryItem[]
  onUseExpr: (item: HistoryItem) => void
  onUseResult: (item: HistoryItem) => void
  onClear: () => void
  onClose: () => void
}

const timeFmt = (() => {
  try {
    return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
})()

export default function History({ items, onUseExpr, onUseResult, onClear, onClose }: Props) {
  return (
    <aside id="history-panel" className="card history" aria-label="Historial de operaciones">
      <div className="history-head">
        <h2>Historial</h2>
        <div className="history-actions">
          {items.length > 0 && (
            <button type="button" className="text-btn" onClick={onClear}>
              Borrar
            </button>
          )}
          <button type="button" className="icon-btn small history-close" onClick={onClose} aria-label="Cerrar historial">
            ✕
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <span className="empty-icon" aria-hidden="true">
            🧮
          </span>
          <p>Aún no hay operaciones.</p>
          <p className="muted">Tus cálculos aparecerán aquí y se guardan en este navegador.</p>
        </div>
      ) : (
        <ol className="history-list">
          {items.map((item) => (
            <li key={item.id} className="history-item">
              <button
                type="button"
                className="history-main"
                onClick={() => onUseExpr(item)}
                aria-label={`Reutilizar expresión ${item.expr}, resultado ${item.result}`}
                title="Reutilizar expresión"
              >
                <span className="h-expr">{item.expr}</span>
                <span className="h-result">= {item.result}</span>
              </button>
              <div className="h-meta">
                <span>
                  {item.angle}
                  {timeFmt && typeof item.ts === 'number' ? ` · ${timeFmt.format(item.ts)}` : ''}
                </span>
                <button type="button" className="text-btn" onClick={() => onUseResult(item)} title="Insertar el resultado">
                  Usar resultado
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  )
}
