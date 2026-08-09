'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail } from 'lucide-react'
import { AccountShell } from './AccountShell'
import { supabase } from '../../lib/supabase'

const inputClass =
  'w-full border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine focus:outline-none focus:border-pine transition-colors'
const labelClass = 'block font-body text-xs tracking-[0.12em] uppercase text-pine-soft mb-1.5'
const errorClass = 'font-body text-xs text-red-600 mt-1'
const filledButton =
  'inline-flex items-center justify-center h-11 w-full bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed'

const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email'),
})

function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState(null)
  const [authError, setAuthError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = async (data) => {
    setAuthError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/account/login`,
    })
    if (error) {
      setAuthError(error.message)
      return
    }
    setSubmittedEmail(data.email)
  }

  if (submittedEmail) {
    return (
      <AccountShell>
        <div className="text-center">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-moss/15 text-moss mb-6">
            <Mail size={22} strokeWidth={2} />
          </span>
          <h1 className="font-display text-2xl text-pine mb-3">Check your email</h1>
          <p className="font-body text-sm text-pine-soft mb-8">
            We&rsquo;ve sent a password reset link to {submittedEmail}.
          </p>
          <Link
            href="/account/login"
            className="font-body text-sm text-moss hover:text-moss-deep transition-colors"
          >
            Back to login &rarr;
          </Link>
        </div>
      </AccountShell>
    )
  }

  return (
    <AccountShell>
      <h1 className="font-display text-2xl text-pine mb-1">Forgot your password?</h1>
      <p className="font-body text-sm text-pine-soft mb-8">
        Enter your email and we&rsquo;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={inputClass}
            type="email"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        {authError && <p className={errorClass}>{authError}</p>}

        <button type="submit" disabled={isSubmitting} className={filledButton}>
          {isSubmitting ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <Link
        href="/account/login"
        className="inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-moss transition-colors mt-6"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Back to login
      </Link>
    </AccountShell>
  )
}

export default ForgotPasswordPage
