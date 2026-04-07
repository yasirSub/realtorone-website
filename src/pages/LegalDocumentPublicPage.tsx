import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import '../styles/legal-pages.css'

type Slug = 'privacy' | 'terms'

export default function LegalDocumentPublicPage({ slug }: { slug: Slug }) {
    const [html, setHtml] = useState<string | null>(null)
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setErr(null)
        setHtml(null)
        void apiClient
            .fetchLegalDocument(slug)
            .then((r: { success?: boolean; html?: string; message?: string }) => {
                if (cancelled) return
                if (r?.success && typeof r.html === 'string') setHtml(r.html)
                else setErr(r?.message ?? 'Could not load this page.')
            })
            .catch(() => {
                if (!cancelled) setErr('Network error.')
            })
        return () => {
            cancelled = true
        }
    }, [slug])

    const otherHref = slug === 'privacy' ? '/terms' : '/privacy'
    const otherLabel = slug === 'privacy' ? 'Terms of Service →' : '← Privacy Policy'

    return (
        <div className="legal-page" data-theme="dark">
            <div className="legal-page-inner">
                <header className="legal-page-header">
                    <a href="/">← Back to RealtorOne</a>
                    <a href={otherHref}>{otherLabel}</a>
                </header>

                {err && (
                    <p style={{ color: '#fca5a5', marginTop: '1rem' }} role="alert">
                        {err}
                    </p>
                )}
                {!err && html === null && (
                    <p style={{ marginTop: '1rem', opacity: 0.7 }}>Loading…</p>
                )}
                {html !== null && (
                    <div className="legal-doc-body" dangerouslySetInnerHTML={{ __html: html }} />
                )}
            </div>
        </div>
    )
}
