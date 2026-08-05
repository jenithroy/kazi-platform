import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { AccountShell } from './AccountShell'

const inputClass =
  'w-full border border-pine/15 bg-paper px-3.5 py-2.5 font-body text-sm text-pine focus:outline-none focus:border-pine transition-colors'
const labelClass = 'block font-body text-xs tracking-[0.12em] uppercase text-pine-soft mb-1.5'
const errorClass = 'font-body text-xs text-red-600 mt-1'
const filledButton =
  'inline-flex items-center justify-center h-11 w-full bg-moss text-pine font-body text-sm font-semibold tracking-wide hover:bg-moss-deep transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed'

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

function LoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)
  const redirect = searchParams.get('redirect')
  const redirectQuery = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) })

  const onSubmit = async () => {
    setSigningIn(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    navigate(redirect || '/')
  }

  return (
    <AccountShell>
      <h1 className="font-display text-2xl text-pine mb-1">Welcome back</h1>
      <p className="font-body text-sm text-pine-soft mb-8">Sign in to your account</p>

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-body text-xs tracking-[0.12em] uppercase text-pine-soft" htmlFor="password">
              Password
            </label>
            <Link
              to={`/account/forgot-password${redirectQuery}`}
              className="font-body text-xs text-moss hover:text-moss-deep transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            className={inputClass}
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && <p className={errorClass}>{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={signingIn} className={filledButton}>
          {signingIn ? 'Signing In…' : 'Sign In'}
        </button>
      </form>

      <p className="font-body text-sm text-pine-soft text-center mt-6">
        Don&rsquo;t have an account?{' '}
        <Link to={`/account/register${redirectQuery}`} className="text-moss hover:text-moss-deep transition-colors">
          Create account &rarr;
        </Link>
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 font-body text-sm text-pine-soft hover:text-moss transition-colors mt-8"
      >
        <ArrowLeft size={14} strokeWidth={1.5} /> Return home
      </Link>
    </AccountShell>
  )
}

export default LoginPage
