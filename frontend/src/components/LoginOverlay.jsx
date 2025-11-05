import { useState } from 'react'

function LoginOverlay({ visible, error, onSubmit }) {
  const [formState, setFormState] = useState({ username: '', password: '' })

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormState((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(formState)
  }

  return (
    <div className={`login-overlay ${visible ? 'visible' : ''}`}>
      <form className="login-card" onSubmit={handleSubmit}>
        <img src="/static/logo.png" alt="3 Strands Cattle Co. logo" />
        <h1>3  S T R A N D S  C A T T L E  CO.</h1>
        <p className="login-subtitle">Access the ranchOS console</p>
        <h2>ranchOS login</h2>
        <label>
          Username
          <input name="username" type="text" value={formState.username} onChange={handleChange} required autoComplete="username" />
        </label>
        <label>
          Password
          <input name="password" type="password" value={formState.password} onChange={handleChange} required autoComplete="current-password" />
        </label>
        <button type="submit">Enter ranchOS</button>
        {error && <p className="login-error">{error}</p>}
      </form>
    </div>
  )
}

export default LoginOverlay
