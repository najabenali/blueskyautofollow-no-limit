import { useState, useMemo } from 'react';
import './App.scss';
import { BskyAgent } from '@atproto/api';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  let skyAgent = false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [followings, setFollowings] = useState([]);
  const [fliteKeyword, setFliteKeyword] = useState('');
  const flitedFollowings = useMemo(() => {
    return followings.filter(actor =>
      `${actor.displayName || ''} : ${actor.description || ''}`.toLowerCase().includes(fliteKeyword.toLowerCase())
    );
  }, [followings, fliteKeyword]);

  const default_avatar = 'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg';

  const toUnfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const bulkUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter(actor => actor.toUnfollow);
    for (let i = 0, len = toUnfollows.length; i < len; i++) {
      const actor = toUnfollows[i];
      await agent.unfollow(actor.did);
      toast.success(`Unfollowed: ${actor.displayName || actor.did} (${i + 1}/${len})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
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
    toast.success(`Loaded ${fetchedFollowings.length} followings!`);
  };

  const toggleToUnfollow = (status, did) => {
    if (did === 'all') {
      setFollowings(followings.map(actor => ({ ...actor, toUnfollow: status })));
    } else {
      setFollowings(followings.map(actor =>
        actor.did === did ? { ...actor, toUnfollow: status } : actor
      ));
    }
  };

  return (
    <div className="app-container">
      <h1 className="title">Bluesky Unfollow Bot 🦋</h1>
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
        <button type="submit" className="blue">Fetch Followings</button>
      </form>

      <div className="controls">
        <input
          type="text"
          placeholder="Filter by keyword"
          value={fliteKeyword}
          onChange={e => setFliteKeyword(e.target.value)}
        />
        <button className="gray" onClick={() => toggleToUnfollow(true, 'all')}>Select All</button>
        <button className="gray" onClick={() => toggleToUnfollow(false, 'all')}>Deselect All</button>
        <button className="blue" onClick={bulkUnfollow} disabled={toUnfollowCount < 1}>
          Unfollow ({toUnfollowCount})
        </button>
      </div>

      <div className="followings-list">
        {flitedFollowings.map(actor => (
          <div className="following-item" key={actor.did}>
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

      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
