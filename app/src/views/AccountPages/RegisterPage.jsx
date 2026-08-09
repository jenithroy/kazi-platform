'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name'),
  company: z.string().trim().optional(),
  email: z.email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
})

function RegisterPage() {
  const searchParams = useSearchParams()
  const [submittedEmail, setSubmittedEmail] = useState(null)
  const [authError, setAuthError] = useState(null)
  const redirect = searchParams.get('redirect')
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data) => {
    setAuthError(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          company_name: data.company || null,
        },
      },
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
            We&rsquo;ve sent a confirmation link to {submittedEmail}. Click it to activate your
            account.
          </p>
          <Link
            href={`/account/login${redirectQuery}`}
            className="font-body text-sm text-moss hover:text-moss-deep transition-colors"
          >
            Go to login &rarr;
          </Link>
        </div>
      </AccountShell>
    )
  }

  return (
    <AccountShell>
      <h1 className="font-display text-2xl text-pine mb-1">Create your account</h1>
      <p className="font-body text-sm text-pine-soft mb-8">
        Save Atelier designs and track your quote requests.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div>
          <label className={labelClass} htmlFor="fullName">
            Full Name
          </label>
          <input
            id="fullName"
            className={inputClass}
            type="text"
            autoComplete="name"
            {...register('fullName')}
          />
          {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="company">
            Company <span className="normal-case text-pine-soft/70">(optional)</span>
          </label>
          <input
            id="company"
            className={inputClass}
            type="text"
            autoComplete="organization"
            {...register('company')}
          />
        </div>

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

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className={inputClass}
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className={errorClass}>{errors.password.message}</p>
          ) : (
            <p className="font-body text-xs text-pine-soft/70 mt-1">Minimum 6 characters</p>
          )}
        </div>

        {authError && <p className={errorClass}>{authError}</p>}

        <button type="submit" disabled={isSubmitting} className={filledButton}>
          {isSubmitting ? 'Creating Account…' : 'Create Account'}
        </button>
      </form>

      <p className="font-body text-sm text-pine-soft text-center mt-6">
        Already have an account?{' '}
        <Link href={`/account/login${redirectQuery}`} className="text-moss hover:text-moss-deep transition-colors">
          Sign in &rarr;
        </Link>
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-moss transition-colors mt-8"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Return home
      </Link>
    </AccountShell>
  )
}

export default RegisterPage
