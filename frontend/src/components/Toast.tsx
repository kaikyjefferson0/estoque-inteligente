type ToastType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

type ToastProps = {
  message: string
  type: ToastType
  onClose: () => void
}

function Toast({
  message,
  type,
  onClose,
}: ToastProps) {
  return (
    <div
      className={`toast toast-${type}`}
      role="alert"
    >
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '×'}
          {type === 'warning' && '!'}
          {type === 'info' && 'i'}
        </span>

        <span className="toast-message">
          {message}
        </span>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  )
}

export default Toast
