import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔥 ERROR BOUNDARY CAUGHT:')
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '1px solid #fcc' }}>
          <h2>🚨 React Error Caught</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Error Details</summary>
            <p><strong>Error:</strong> {this.state.error?.toString()}</p>
            <p><strong>Stack:</strong></p>
            <pre>{this.state.error?.stack}</pre>
            <p><strong>Component Stack:</strong></p>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}