import { useState } from 'react'
import './App.scss'
import { BskyAgent } from '@atproto/api'
import toast, { Toaster } from 'react-hot-toast'

function App() {
  let skyAgent = false
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [startAccount, setStartAccount] = useState('')
  const [followers, setFollowers] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const getAgent = async () => {
    if (skyAgent) return skyAgent
    const agent = new BskyAgent({ service: 'https://bsky.social' })
    try {
      await agent.login({ identifier: username, password })
      skyAgent = agent
      toast.success('Connected successfully!')
      return agent
    } catch (error) {
      console.error(error)
      toast.error('Login failed. Please use an app password.')
      return null
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const agent = await getAgent()
    if (!agent) {
      setIsLoading(false)
      return
    }

    let cursor = null
    let allFollowers = []
    const maxFetches = Math.ceil(1500 / 100) // Each API call fetches 100 items max

    try {
      for (let i = 0; i < maxFetches; i++) {
        const { data } = await agent.getFollowers({ actor: startAccount, limit: 100, cursor })
        if (data.followers) {
          allFollowers = [...allFollowers, ...data.followers]
          cursor = data.cursor
          if (!cursor || allFollowers.length >= 1500) break
        }
      }

      const uniqueFollowers = allFollowers.filter(
        (item, index, self) => self.findIndex((f) => f.did === item.did) === index
      )

      setFollowers(uniqueFollowers.slice(0, 1500))
      toast.success(`Fetched ${uniqueFollowers.length} followers!`)
    } catch (error) {
      console.error('Error fetching followers:', error)
      toast.error('Failed to fetch followers.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleFormSubmit}>
        <input
          type="text"
          placeholder="Bluesky Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="App Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Target Username"
          value={startAccount}
          onChange={(e) => setStartAccount(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Fetching...' : 'Fetch Followers'}
        </button>
      </form>
      <div>
        {followers.map((follower) => (
          <div key={follower.did}>
            <p>{follower.displayName || follower.handle}</p>
          </div>
        ))}
      </div>
      <Toaster />
    </div>
  )
}

export default App
