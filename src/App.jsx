import { useState } from 'react';
import './App.scss';
import { BskyAgent } from '@atproto/api';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  let skyAgent = false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [followings, setFollowings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const default_avatar =
    'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg';

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

  const handleFetchFollowings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const agent = await getAgent();
    let cursor = null;
    const fetchedFollowings = [];

    try {
      do {
        const { data } = await agent.getFollows({ actor: username, limit: 100, cursor });
        if (data.follows) {
          fetchedFollowings.push(...data.follows);
          cursor = data.cursor;
        }
      } while (cursor);

      setFollowings(
        fetchedFollowings.map((actor) => ({
          ...actor,
          toUnfollow: false, // Initialize `toUnfollow` for each actor
        }))
      );
      toast.success(`Loaded ${fetchedFollowings.length} followings!`);
    } catch (error) {
      toast.error('Failed to fetch followings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter((actor) => actor.toUnfollow);

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      try {
        await agent.unfollow(actor.did);
        toast.success(`Unfollowed: ${actor.displayName || actor.did}`);
      } catch (error) {
        toast.error(`Failed to unfollow: ${actor.displayName || actor.did}`);
      }
    }

    // Remove unfollowed users from the state
    setFollowings((prevFollowings) =>
      prevFollowings.filter((actor) => !actor.toUnfollow)
    );
  };

  const toggleSelectAll = (status) => {
    setFollowings((prevFollowings) =>
      prevFollowings.map((actor) => ({
        ...actor,
        toUnfollow: status,
      }))
    );
  };

  const toggleUnfollow = (status, did) => {
    setFollowings((prevFollowings) =>
      prevFollowings.map((actor) =>
        actor.did === did ? { ...actor, toUnfollow: status } : actor
      )
    );
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
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>App Password:</label>
          <input
            type="password"
            placeholder="App-specific password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            <button className="gray" onClick={() => toggleSelectAll(true)}>
              Select All
            </button>
            <button className="gray" onClick={() => toggleSelectAll(false)}>
              Deselect All
            </button>
            <button
              className="blue"
              onClick={handleUnfollow}
              disabled={!followings.some((actor) => actor.toUnfollow)}
            >
              Unfollow Selected
            </button>
          </div>
          {followings.map((actor) => (
            <div key={actor.did} className="following-item">
              <img
                src={actor.avatar || default_avatar}
                alt={actor.displayName || actor.handle}
              />
              <div>
                <h3>{actor.displayName || actor.handle}</h3>
                <p>{actor.description}</p>
              </div>
              <input
                type="checkbox"
                checked={actor.toUnfollow}
                onChange={(e) => toggleUnfollow(e.target.checked, actor.did)}
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
