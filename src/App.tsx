import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { api, ApiError, tokenKey } from './api'
import './App.css'

const TaskStatus = { Todo: 0, InProgress: 1, Done: 2 } as const
type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]
const TaskPriority = { Low: 0, Medium: 1, High: 2 } as const
type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

type Assignment = { id: number; todoItemId: number; assignedToUserId: number; assignedToUserName: string; assignedAt: string }
type Task = { id: number; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; dueDate: string | null; boardId: number; assignments: Assignment[] }
type Member = { id: number; boardId: number; userId: number; userName: string; userEmail: string; joinedAt: string }
type Board = { id: number; title: string; description: string | null; ownerId: number; ownerName: string; tasks: Task[]; members: Member[] }
type Profile = { id: number; name: string; emailAddress: string; age: number; role: string }

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return <main className="auth-shell"><section className="auth-card"><div className="brand">Taskflow</div><h1>{title}</h1><p className="muted">{subtitle}</p>{children}</section></main>
}

function Signup() {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email'))
    if (email.length > 30) return setError('Email addresses must be 30 characters or fewer.')
    try {
      await api('/signup', { method: 'POST', body: JSON.stringify({ name: data.get('name'), email, password: data.get('password'), age: Number(data.get('age')) }) })
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create your account.') }
  }
  return <AuthCard title="Create your workspace" subtitle="Plan work together, one task at a time.">
    <form onSubmit={submit}><Field label="Full name"><input name="name" minLength={3} maxLength={30} required /></Field><Field label="Email"><input name="email" type="email" maxLength={30} required /></Field><Field label="Age"><input name="age" type="number" min={16} max={100} required /></Field><Field label="Password"><input name="password" type="password" minLength={6} maxLength={30} required /></Field>{error && <p className="error">{error}</p>}<button>Create account</button></form>
    <p className="switch">Already have an account? <button className="link" onClick={() => navigate('/signin')}>Sign in</button></p>
  </AuthCard>
}

function VerifyOtp() {
  const email = new URLSearchParams(window.location.search).get('email') ?? ''
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => { if (!cooldown) return; const id = window.setInterval(() => setCooldown(value => value - 1), 1000); return () => clearInterval(id) }, [cooldown])
  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code')).replace(/\D/g, '')
    if (code.length !== 6) return setError('Enter the 6-digit code from your email.')
    try { const result = await api<{ accessToken: string }>('/signup/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }); localStorage.setItem(tokenKey, result.accessToken); navigate('/boards') }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to verify code.') }
  }
  const resend = async () => {
    try { await api('/signup/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }); setCooldown(60); setError('') }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to resend code.') }
  }
  return <AuthCard title="Check your inbox" subtitle={`We sent a six-digit verification code to ${email || 'your email'}.`}>
    <form onSubmit={verify}><Field label="Verification code"><input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required /></Field>{error && <p className="error">{error}</p>}<button>Verify email</button></form>
    <p className="switch">Didn't receive it? <button className="link" disabled={!!cooldown} onClick={resend}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></p>
  </AuthCard>
}

function Signin() {
  const [error, setError] = useState('')
  const passwordReset = new URLSearchParams(window.location.search).get('passwordReset') === '1'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email'))
    try { const result = await api<{ accessToken: string }>('/signin', { method: 'POST', body: JSON.stringify({ email, password: data.get('password') }) }); localStorage.setItem(tokenKey, result.accessToken); navigate('/boards') }
    catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.message.includes('verify')) navigate(`/verify-otp?email=${encodeURIComponent(email)}`)
      else setError(err instanceof Error ? err.message : 'Unable to sign in.')
    }
  }
  return <AuthCard title="Welcome back" subtitle="Sign in to pick up where you left off.">
    <form onSubmit={submit}><Field label="Email"><input name="email" type="email" maxLength={30} required /></Field><Field label="Password"><input name="password" type="password" required /></Field>{passwordReset && <p className="success" role="status">Your password has been reset. You can now sign in.</p>}{error && <p className="error">{error}</p>}<button>Sign in</button></form>
    <p className="switch"><button className="link" onClick={() => navigate('/forgot-password')}>Forgot your password?</button></p>
    <p className="switch">New to Taskflow? <button className="link" onClick={() => navigate('/signup')}>Create an account</button></p>
  </AuthCard>
}

function ForgotPassword() {
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email'))
    try {
      await api('/ForgotPassword', { method: 'POST', body: JSON.stringify({ email }) })
      navigate(`/reset-password?email=${encodeURIComponent(email)}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to request a password reset code.') }
  }
  return <AuthCard title="Reset your password" subtitle="Enter your email and we’ll send a six-digit reset code if an account exists.">
    <form onSubmit={submit}><Field label="Email"><input name="email" type="email" maxLength={30} autoComplete="email" required /></Field>{error && <p className="error">{error}</p>}<button>Send reset code</button></form>
    <p className="switch">Remembered your password? <button className="link" onClick={() => navigate('/signin')}>Sign in</button></p>
  </AuthCard>
}

function ResetPassword() {
  const initialEmail = new URLSearchParams(window.location.search).get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(60)
  useEffect(() => { if (!cooldown) return; const id = window.setInterval(() => setCooldown(value => value - 1), 1000); return () => clearInterval(id) }, [cooldown])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const code = String(data.get('code')).replace(/\D/g, '')
    const newPassword = String(data.get('newPassword'))
    if (code.length !== 6) return setError('Enter the 6-digit code from your email.')
    try {
      await api('/ForgotPassword/reset', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) })
      navigate('/signin?passwordReset=1')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to reset your password.') }
  }
  const resend = async () => {
    if (!email) return setError('Enter your email before requesting another code.')
    try {
      await api('/ForgotPassword/resend-otp', { method: 'POST', body: JSON.stringify({ email }) })
      setCooldown(60)
      setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to resend code.') }
  }
  return <AuthCard title="Check your inbox" subtitle="Enter the six-digit reset code and choose a new password.">
    <form onSubmit={submit}><Field label="Email"><input name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={30} autoComplete="email" required /></Field><Field label="Reset code"><input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required /></Field><Field label="New password"><input name="newPassword" type="password" minLength={6} maxLength={30} autoComplete="new-password" required /></Field>{error && <p className="error">{error}</p>}<button>Reset password</button></form>
    <p className="switch">Didn't receive it? <button className="link" disabled={!!cooldown} onClick={resend}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></p>
  </AuthCard>
}

function AppShell({ children, profile }: { children: ReactNode; profile: Profile | null }) {
  return <><header><button className="brand link" onClick={() => navigate('/boards')}>Taskflow</button><div className="header-actions">{profile && <span className="user-chip" title={`User ID: ${profile.id}`}>{profile.name}</span>}<button className="quiet" onClick={() => { localStorage.removeItem(tokenKey); navigate('/signin') }}>Sign out</button></div></header>{children}</>
}

function Boards({ profile }: { profile: Profile | null }) {
  const [boards, setBoards] = useState<Board[]>([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const load = useCallback(async () => { try { setBoards((await api<{ items: Board[] }>('/api/board/user/boards?page=1&pageSize=100')).items) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load boards.') } }, [])
  useEffect(() => { void load() }, [load])
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    try { const board = await api<Board>('/api/board', { method: 'POST', body: JSON.stringify({ title: data.get('title'), description: data.get('description') || null }) }); navigate(`/boards/${board.id}`) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create board.') }
  }
  return <AppShell profile={profile}><main className="page"><div className="page-heading"><div><p className="eyebrow">Your workspace</p><h1>Boards</h1></div><button onClick={() => setCreating(true)}>+ New board</button></div>{error && <p className="error">{error}</p>}{creating && <form className="panel form-row" onSubmit={create}><Field label="Board name"><input name="title" minLength={3} maxLength={100} autoFocus required /></Field><Field label="Description"><input name="description" maxLength={500} /></Field><div className="actions"><button className="quiet" type="button" onClick={() => setCreating(false)}>Cancel</button><button>Create board</button></div></form>}<section className="board-grid">{boards.map(board => <button className="board-card" key={board.id} onClick={() => navigate(`/boards/${board.id}`)}><span className="board-icon">▦</span><h2>{board.title}</h2><p>{board.description || 'No description yet.'}</p><footer>{board.tasks.length} {board.tasks.length === 1 ? 'task' : 'tasks'} · {board.members.length + 1} members</footer></button>)}{!boards.length && !error && <div className="empty">No boards yet. Create one to begin organizing your work.</div>}</section></main></AppShell>
}

const columns: { status: TaskStatus; title: string }[] = [{ status: TaskStatus.Todo, title: 'To do' }, { status: TaskStatus.InProgress, title: 'In progress' }, { status: TaskStatus.Done, title: 'Done' }]
const priorityLabels: Record<TaskPriority, string> = { [TaskPriority.Low]: 'Low', [TaskPriority.Medium]: 'Medium', [TaskPriority.High]: 'High' }

function BoardDetail({ boardId, profile }: { boardId: number; profile: Profile | null }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [memberId, setMemberId] = useState('')
  const isOwner = profile?.id === board?.ownerId
  const load = useCallback(async () => { try { setBoard(await api<Board>(`/api/board/${boardId}`)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load board.') } }, [boardId])
  useEffect(() => { void load() }, [load])
  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    try { await api('/api/todoitem', { method: 'POST', body: JSON.stringify({ title: data.get('title'), description: data.get('description') || null, boardId, priority: Number(data.get('priority')), dueDate: data.get('dueDate') ? new Date(String(data.get('dueDate'))).toISOString() : null }) }); setAdding(false); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create task.') }
  }
  const moveTask = async (task: Task, status: TaskStatus) => {
    if (task.status === status) return
    setBoard(current => current ? { ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, status } : item) } : current)
    try { await api(`/api/todoitem/${task.id}`, { method: 'PUT', body: JSON.stringify({ title: task.title, description: task.description, status, priority: task.priority, dueDate: task.dueDate }) }) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to move task.'); await load() }
  }
  const addMember = async (event: FormEvent) => { event.preventDefault(); try { await api('/api/boardmember', { method: 'POST', body: JSON.stringify({ boardId, newMemberId: Number(memberId) }) }); setMemberId(''); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to add member.') } }
  const deleteTask = async (id: number) => { if (!window.confirm('Delete this task?')) return; try { await api(`/api/todoitem/${id}`, { method: 'DELETE' }); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete task.') } }
  if (error && !board) return <AppShell profile={profile}><main className="page"><p className="error">{error}</p><button onClick={() => navigate('/boards')}>Back to boards</button></main></AppShell>
  if (!board) return <AppShell profile={profile}><main className="page loading">Waking up your workspace…</main></AppShell>
  return <AppShell profile={profile}><main className="page"><button className="back link" onClick={() => navigate('/boards')}>← All boards</button><div className="page-heading"><div><p className="eyebrow">Owned by {board.ownerName}</p><h1>{board.title}</h1><p className="muted">{board.description}</p></div><button onClick={() => setAdding(true)}>+ Add task</button></div>{error && <p className="error">{error}</p>}{adding && <form className="panel task-form" onSubmit={addTask}><Field label="Task title"><input name="title" minLength={3} maxLength={200} autoFocus required /></Field><Field label="Description"><textarea name="description" maxLength={1000} /></Field><Field label="Priority"><select name="priority" defaultValue={TaskPriority.Medium}><option value={TaskPriority.Low}>Low</option><option value={TaskPriority.Medium}>Medium</option><option value={TaskPriority.High}>High</option></select></Field><Field label="Due date"><input name="dueDate" type="date" /></Field><div className="actions"><button type="button" className="quiet" onClick={() => setAdding(false)}>Cancel</button><button>Add task</button></div></form>}<section className="kanban">{columns.map(column => <div className="column" key={column.status} onDragOver={event => event.preventDefault()} onDrop={event => { const id = Number(event.dataTransfer.getData('task-id')); const task = board.tasks.find(item => item.id === id); if (task) void moveTask(task, column.status) }}><h2>{column.title}<span>{board.tasks.filter(task => task.status === column.status).length}</span></h2>{board.tasks.filter(task => task.status === column.status).map(task => <article className="task-card" key={task.id} draggable onDragStart={event => event.dataTransfer.setData('task-id', String(task.id))}><div className="task-top">  <span className={`priority priority-${task.priority}`}>{priorityLabels[task.priority]}</span>{isOwner && <button className="icon-button" onClick={() => void deleteTask(task.id)} aria-label={`Delete ${task.title}`}>×</button>}</div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-meta">{task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}{task.assignments.map(item => <span className="avatar" title={item.assignedToUserName} key={item.id}>{item.assignedToUserName.slice(0, 1)}</span>)}</div></article>)}</div>)}</section><section className="members panel"><div><h2>People on this board</h2><p className="muted">Your user ID is visible in the header and can be shared to join another board.</p></div><div className="member-list"><span className="member"><b>{board.ownerName}</b><small>Owner</small></span>{board.members.map(member => <span className="member" key={member.id}><b>{member.userName}</b><small>{member.userEmail}</small></span>)}</div>{isOwner && <form className="member-form" onSubmit={addMember}><input value={memberId} onChange={event => setMemberId(event.target.value)} inputMode="numeric" placeholder="User ID" required /><button>Add member</button></form>}</section></main></AppShell>
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => { const listener = () => setPath(window.location.pathname); window.addEventListener('popstate', listener); window.addEventListener('taskflow:unauthorized', listener); return () => { window.removeEventListener('popstate', listener); window.removeEventListener('taskflow:unauthorized', listener) } }, [])
  useEffect(() => { if (!localStorage.getItem(tokenKey)) { setProfile(null); return }; void api<Profile>('/api/user/profile').then(setProfile).catch(() => setProfile(null)) }, [path])
  const boardId = useMemo(() => /^\/boards\/(\d+)$/.exec(path)?.[1], [path])
  if (!localStorage.getItem(tokenKey) && !['/signup', '/verify-otp', '/signin', '/forgot-password', '/reset-password'].includes(path)) { navigate('/signin'); return null }
  if (path === '/signup') return <Signup />
  if (path === '/verify-otp') return <VerifyOtp />
  if (path === '/signin') return <Signin />
  if (path === '/forgot-password') return <ForgotPassword />
  if (path === '/reset-password') return <ResetPassword />
  if (boardId) return <BoardDetail boardId={Number(boardId)} profile={profile} />
  return <Boards profile={profile} />
}

export default App
