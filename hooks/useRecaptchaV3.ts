import { useCallback, useEffect, useRef } from 'react'

interface RecaptchaV3 {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha: RecaptchaV3
  }
}

export const useRecaptchaV3 = (siteKey?: string) => {
  if (!siteKey) {
    siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  }
  const isLoaded = useRef(false)
  const isLoading = useRef(false)

  const loadScript = useCallback(() => {
    if (isLoaded.current || isLoading.current) return Promise.resolve()

    isLoading.current = true

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
      script.async = true
      script.defer = true

      script.onload = () => {
        isLoaded.current = true
        isLoading.current = false
        resolve()
      }

      script.onerror = () => {
        isLoading.current = false
        reject(new Error('Failed to load reCAPTCHA script'))
      }

      document.head.appendChild(script)
    })
  }, [siteKey])

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    try {
      await loadScript()

      return new Promise((resolve) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(siteKey, { action }).then(resolve).catch(() => resolve(null))
        })
      })
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error)
      return null
    }
  }, [siteKey, loadScript])

  useEffect(() => {
    loadScript()
  }, [loadScript])

  return { executeRecaptcha }
}