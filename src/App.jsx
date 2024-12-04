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

  const toUnfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const maxUnfollowsPerDay = 500;

  const bulkUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter(actor => actor.toUnfollow).slice(0, maxUnfollowsPerDay);

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      try {
        if (!actor.followUri) {
          toast.error(`Missing follow URI for ${actor.displayName || actor.did}`);
          continue;
        }
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
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    try {
      await agent.login({ identifier: username, password });
      toast.success('Connected, fetching followings...');
      skyAgent = agent;
      return agent;
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Use your app password, not your account password.');
    }
  };

  const fetchFollowings = async () => {
    const agent = await getAgent();
    if (!agent) return;

    const maxFetchAttempts = 15;
    let cursor = null;
    let followed = [];
    let attempt = 0;

    setIsLoading(true);

    try {
      do {
        attempt++;
        const { data } = await agent.getFollows({ actor: username, limit: 100, cursor });
        followed = [...followed, ...(data.follows || [])];
        cursor = data.cursor || null;
      } while (cursor && attempt < maxFetchAttempts);

      followed = followed.filter((actor, index, self) => self.findIndex(t => t.did === actor.did) === index);
      setFollowings(followed.map(actor => ({ ...actor, toUnfollow: false, followUri: actor.viewer.followUri })));
      toast.success('Fetched followings successfully.');
    } catch (error) {
      console.error('Failed to fetch followings:', error.message);
      toast.error('Failed to fetch followings. Please check the username and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToUnfollow = (status, did) => {
    setFollowings(prev =>
      prev.map(actor => (actor.did === did || did === 'all' ? { ...actor, toUnfollow: status } : actor))
    );
  };

  return (
    <>
      <div className="text-3xl mt-10 text-center">BlueWave 🦋
        <div className="text-sm text-gray-300">Unfollow multiple users at once</div>
      </div>
      <form className="flex flex-col p-10 max-w-[600px] mt-10 m-auto rounded shadow-xl bg-blue-50">
        <div className="flex flex-row justify-between mb-5">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="user.bsky.social"
          />
        </div>
        <div className="flex flex-row justify-between mb-5">
          <label>App Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="abcd-efgh-hijk-lmno"
          />
        </div>
        <div className="flex justify-between">
          <button type="button" onClick={fetchFollowings} disabled={isLoading}>
            Fetch Followings
          </button>
          <button type="button" onClick={bulkUnfollow} disabled={isLoading || toUnfollowCount === 0}>
            Unfollow ({toUnfollowCount})
          </button>
        </div>
      </form>
      <div className="mt-5 max-w-[600px] m-auto">
        {followings && followings.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-3">
              <button onClick={() => toggleToUnfollow(true, 'all')} className="bg-blue-500 text-white p-2 rounded">
                Select All
              </button>
              <button onClick={() => toggleToUnfollow(false, 'all')} className="bg-gray-500 text-white p-2 rounded">
                Deselect All
              </button>
            </div>
            <div>
              {followings.map(actor => (
                <div
                  key={actor.did}
                  className="flex items-center justify-between p-2 border rounded mb-2"
                >
                  <img
                    src={actor.avatar || default_avatar}
                    alt={actor.displayName || actor.did}
                    className="w-12 h-12 rounded-full"
                    onError={e => (e.target.src = default_avatar)}
                  />
                  <div className="ml-4 flex-1">
                    <div className="font-bold">{actor.displayName || actor.did}</div>
                    <div className="text-sm text-gray-500">{actor.handle}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={actor.toUnfollow}
                    onChange={e => toggleToUnfollow(e.target.checked, actor.did)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Toaster position="bottom-center" />
    </>
  );
}

export default App;
