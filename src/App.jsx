import { useState, useMemo } from 'react'
import './App.scss'
import { BskyAgent } from '@atproto/api'
import toast, { Toaster } from 'react-hot-toast'

function App() {
  let skyAgent = false
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const startUsername = new URLSearchParams(window.location.search).get('start') || ''
  const [startFollowerAccount, setStartFollowerAccount] = useState(startUsername)
  const [followers, setFollowers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [followAuthor, setFollowAuthor] = useState(true)

  const [filterKeyword, setFilterKeyword] = useState('')
  const filteredFollowers = useMemo(() => {
    return followers.filter(actor => 
      `${actor.displayName || ''} : ${actor.description || ''}`.includes(filterKeyword)
    )
  }, [followers, filterKeyword])

  const defaultAvatar = 'https://cdn.bsky.app/img/avatar/plain/default-avatar.jpg'
  const authorDid = 'did:plc:vlt4uq7tqbbinku5q7u4u43r'

  const toFollowCount = useMemo(() => {
    return followers.filter(actor => actor.toFollow).length
  }, [followers])

  const bulkFollow = async () => {
    const agent = await getAgent()
    const toFollows = followers.filter(actor => actor.toFollow)
    for (let i = 0, len = toFollows.length; i < len; i++) {
      const actor = toFollows[i]
      const { uri } = await agent.follow(actor.did)
      console.log(uri)
      toast.success(`Followed: ${actor.displayName || actor.did} ${i + 1}/${len}`)
      await new Promise(resolve => setTimeout(resolve, 7))
    }

    if (followAuthor) {
      await agent.follow(authorDid)
      toast.success('Followed: BlueWave creator')
    }
  }

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
      toast.error('Login failed. Use your app password, not account password.')
      setTimeout(() => {
        if (window.confirm('Open Bluesky App Password page?')) {
          window.open('https://bsky.app/settings/app-passwords', '_blank')
        }
      }, 1000)
    }
  }

  const handleFormSubmit = async e => {
    e.preventDefault()
    setIsLoading(true)

    const agent = await getAgent()
    const max = 1000
    let cursor = null
    let fetchedFollowers = []

    for (let i = 0; i < max; i++) {
      const { data } = await agent.getFollowers({ actor: startFollowerAccount, limit: 100, cursor })
      console.log(data, `${i + 1}/${max}`)
      
      if (!fetchedFollowers.length && data.subject) fetchedFollowers.push(data.subject)
      if (data.follows) {
        fetchedFollowers = [...fetchedFollowers, ...data.follows]
        cursor = data.cursor || null
      }
      if (!cursor) break
    }

    fetchedFollowers = fetchedFollowers.filter(
      (actor, index, self) => self.findIndex(t => t.did === actor.did) === index
    )

    setFollowers(fetchedFollowers)
    setIsLoading(false)
  }

  const toggleToFollow = (status, did) => {
    if (did === 'all') {
      const updatedFollowers = filteredFollowers.map(actor => ({ ...actor, toFollow: status }))
      const mergedFollowers = [...updatedFollowers, ...followers].filter(
        (actor, index, self) => self.findIndex(t => t.did === actor.did) === index
      )
      setFollowers(mergedFollowers)
    } else {
      const updatedFollowers = [...followers]
      const index = updatedFollowers.findIndex(actor => actor.did === did)
      if (index !== -1) {
        updatedFollowers[index].toFollow = status
        setFollowers(updatedFollowers)
      }
    }
  }

  return (
    <>
      <div className="text-3xl mt-10 text-center">
        BlueWave 🦋
        <div className="text-sm text-gray-300">Follow multiple users at once</div>
      </div>
      <form onSubmit={handleFormSubmit} className="form-container">
        <div className="input-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="user.bsky.social"
            required
          />
        </div>
        <div className="input-group">
          <label>App Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="abcd-efgh-hijl-mnop"
            required
          />
        </div>
        <div className="input-group">
          <label>Starting Username</label>
          <input
            type="text"
            value={startFollowerAccount}
            onChange={e => setStartFollowerAccount(e.target.value)}
            placeholder="user.bsky.social"
            required
          />
        </div>
        <button type="submit" disabled={isLoading}>
          Fetch Followers
        </button>
      </form>
      <div className="followers-list">
        {filteredFollowers.map(actor => (
          <div key={actor.did} className="actor-item">
            <img src={actor.avatar || defaultAvatar} alt={actor.displayName} />
            <div>
              <a href={`https://bsky.app/profile/${actor.handle}`} target="_blank" rel="noreferrer">
                {actor.displayName}
              </a>
            </div>
            <input
              type="checkbox"
              checked={actor.toFollow || false}
              onChange={e => toggleToFollow(e.target.checked, actor.did)}
            />
          </div>
        ))}
      </div>
      <Toaster position="bottom-center" />
    </>
  )
}

export default App
