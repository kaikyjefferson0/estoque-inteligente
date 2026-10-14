import { useState } from 'react'

type CollapsibleSectionProps = {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] =
    useState(defaultOpen)

  return (
    <section className="products-card collapsible-section">
      <button
        type="button"
        className="collapsible-header"
        onClick={() =>
          setIsOpen((current) => !current)
        }
        aria-expanded={isOpen}
      >
        <div className="collapsible-title">
          <h2>{title}</h2>

          {description && (
            <p>{description}</p>
          )}
        </div>

        <span
          className={`collapsible-arrow ${
            isOpen ? 'open' : ''
          }`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </section>
  )
}

export default CollapsibleSection
