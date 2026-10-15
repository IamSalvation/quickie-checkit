import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log so it's visible in devtools and Vercel logs
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.href = '/'
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl font-bold text-red-500">!</div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            An unexpected error occurred. Try reloading the page.
          </p>
          {this.state.error.message && (
            <pre className="mt-4 max-h-32 overflow-auto rounded bg-slate-100 p-3 text-left text-xs text-slate-700">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Try again
            </button>
            <button
              onClick={this.handleReload}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}