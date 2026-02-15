interface FooterProps {
  onShowGuide?: () => void
}

export function Footer({ onShowGuide }: FooterProps) {
  return (
    <footer className="flex items-center justify-between py-4 px-4 lg:px-6 text-sm text-muted-foreground border-t">
      <span>&copy; 2026 TaskManager</span>
      {onShowGuide && (
        <button
          onClick={onShowGuide}
          className="hover:text-foreground transition-colors"
        >
          Getting Started
        </button>
      )}
    </footer>
  )
}
