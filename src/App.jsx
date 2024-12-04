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
  const [filterKeyword, setFilterKeyword] = useState('');

  const filteredFollowings = useMemo(() => {
    return followings.filter(actor =>
      `${actor.displayName || ''} ${actor.description || ''}`
        .toLowerCase()
        .includes(filterKeyword.toLowerCase())
    );
  }, [followings, filterKeyword]);

  const toUnfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const defaultAvatar =
    'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg';

  const maxUnfollowsPerDay = 500;

  const bulkUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter(actor => actor.toUnfollow).slice(0, maxUnfollowsPerDay);

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      if (!actor.followUri) {
        console.warn(`Missing follow URI for ${actor.displayName || actor.did}`);
        toast.error(`Cannot unfollow ${actor.displayName || actor.did}: Missing follow URI`);
        continue; // Skip this actor
      }

      try {
        await agent.deleteFollow(actor.followUri);
        toast.success(`Unfollowed: ${actor.displayName || actor.did} (${i + 1}/${toUnfollows.length})`);
      } catch (error) {
        console.error(`Failed to unfollow ${actor.displayName || actor.did}:`, error.message);
        toast.error(`Failed to unfollow ${actor.displayName || actor.did}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
    }
  };

  const getAgent = async () => {
    if (skyAgent) return skyAgent;

    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });

    try {
      await agent.login({
        identifier: username,
        password,
      });
      skyAgent = agent;
      toast.success('Connected successfully.');
      return agent;
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Use your app password instead of your account password.');
      return null;
    }
  };

  const handleFetchFollowings = async () => {
    setIsLoading(true);
    const agent = await getAgent();
    if (!agent) return;

    let cursor = null;
    let fetchedFollowings = [];
    try {
      do {
        const { data } = await agent.getFollows({
          actor: username,
          limit: 100,
          cursor,
        });
        if (data.follows) {
          fetchedFollowings = [...fetchedFollowings, ...data.follows];
          cursor = data.cursor;
        } else {
          cursor = null;
        }
      } while (cursor);

      setFollowings(
        fetchedFollowings.map(actor => ({
          ...actor,
          toUnfollow: false,
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch followings.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUnfollow = (status, did) => {
    const updatedFollowings = followings.map(actor =>
      actor.did === did ? { ...actor, toUnfollow: status } : actor
    );
    setFollowings(updatedFollowings);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>BlueWave 🦋</h1>
        <p className="subtitle">Easily unfollow users in bulk</p>
      </header>

      <form
        onSubmit={e => {
          e.preventDefault();
          handleFetchFollowings();
        }}
        className="form-container"
      >
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="user.bsky.social"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">App Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="abcd-efgh-hijl-mnop"
            required
          />
        </div>

        <button type="submit" className="primary-btn" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Fetch Followings'}
        </button>
      </form>

      {followings.length > 0 && (
        <div className="followings-container">
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Filter by keyword"
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
            />
            <div className="actions">
              <button onClick={() => toggleUnfollow(true, 'all')} className="select-all-btn">
                Select All
              </button>
              <button onClick={() => toggleUnfollow(false, 'all')} className="deselect-all-btn">
                Deselect All
              </button>
              <button
                onClick={bulkUnfollow}
                className="unfollow-btn"
                disabled={toUnfollowCount === 0}
              >
                Unfollow ({toUnfollowCount})
              </button>
            </div>
          </div>

          <div className="followings-list">
            {filteredFollowings.map(actor => (
              <div key={actor.did} className="following-item">
                <img
                  src={actor.avatar || defaultAvatar}
                  alt={actor.displayName || 'Avatar'}
                  className="avatar"
                />
                <div className="info">
                  <h3>{actor.displayName || actor.handle}</h3>
                  <p>{actor.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={actor.toUnfollow}
                  onChange={e => toggleUnfollow(e.target.checked, actor.did)}
                  className="unfollow-checkbox"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
