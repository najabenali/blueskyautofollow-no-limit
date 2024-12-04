import { useState, useMemo } from 'react';
import './App.scss';
import { BskyAgent } from '@atproto/api';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  let skyAgent = false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [followings, setFollowings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const default_avatar = 'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg';

  const unfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const bulkUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter(actor => actor.toUnfollow);

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      await agent.unfollow(actor.did);
      toast.success(`Unfollowed: ${actor.displayName || actor.did} (${i + 1}/${toUnfollows.length})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setFollowings(followings.filter(actor => !actor.toUnfollow));
  };

  const getAgent = async () => {
    if (skyAgent) return skyAgent;
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    try {
      await agent.login({ identifier: username, password });
      skyAgent = agent;
      toast.success('Logged in successfully!');
      return agent;
    } catch (error) {
      console.error(error);
      toast.error('Login failed! Use an app-specific password.');
    }
  };

  const handleFetchFollowings = async e => {
    e.preventDefault();
    setIsLoading(true);
    const agent = await getAgent();
    let cursor = null;
    let i = 0;
    const fetchedFollowings = [];

    do {
      i++;
      const { data } = await agent.getFollows({ actor: username, limit: 100, cursor });
      if (data.follows) {
        fetchedFollowings.push(...data.follows);
        cursor = data.cursor;
      }
    } while (cursor && i < 10);

    setFollowings(fetchedFollowings);
    setIsLoading(false);
    toast.success(`Loaded ${fetchedFollowings.length} followings!`);
  };

  const toggleToUnfollow = (status, did) => {
    setFollowings(followings.map(actor =>
      actor.did === did ? { ...actor, toUnfollow: status } : actor
    ));
  };

  return (
    <div className="app-container">
      <h1 className="text-3xl mt-10 text-center">Bluesky Unfollow Tool 🦋</h1>
      <form onSubmit={handleFetchFollowings} className="form">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            placeholder="yourusername.bsky.social"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>App Password:</label>
          <input
            type="password"
            placeholder="App-specific password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="blue" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Fetch Followings'}
        </button>
      </form>

      {followings.length > 0 && (
        <div className="followings-list">
          <div className="actions">
            <button className="gray" onClick={() => toggleToUnfollow(true, 'all')}>Select All</button>
            <button className="gray" onClick={() => toggleToUnfollow(false, 'all')}>Deselect All</button>
            <button className="blue" onClick={bulkUnfollow} disabled={unfollowCount < 1}>
              Unfollow ({unfollowCount})
            </button>
          </div>
          {followings.map(actor => (
            <div key={actor.did} className="following-item">
              <img src={actor.avatar || default_avatar} alt={actor.displayName} />
              <div>
                <h3>{actor.displayName || actor.handle}</h3>
                <p>{actor.description}</p>
              </div>
              <input
                type="checkbox"
                checked={actor.toUnfollow || false}
                onChange={e => toggleToUnfollow(e.target.checked, actor.did)}
              />
            </div>
          ))}
        </div>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
