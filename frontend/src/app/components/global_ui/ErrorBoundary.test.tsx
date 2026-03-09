import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

const ProblemChild = () => {
    throw new Error('Test Error')
}

describe('ErrorBoundary', () => {
    const originalError = console.error
    beforeAll(() => {
        console.error = jest.fn()
    })
    afterAll(() => {
        console.error = originalError
    })

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <div>Safe Content</div>
            </ErrorBoundary>
        )
        expect(screen.getByText('Safe Content')).toBeInTheDocument()
    })

    it('renders fallback UI when an error occurs', () => {
        render(
            <ErrorBoundary>
                <ProblemChild />
            </ErrorBoundary>
        )
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        expect(screen.getByText('Test Error')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom Fallback</div>}>
                <ProblemChild />
            </ErrorBoundary>
        )
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
    })
})
