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
      `${actor.displayName || ''} : ${actor.description || ''}`.toLowerCase().includes(filterKeyword.toLowerCase())
    );
  }, [followings, filterKeyword]);

  const default_avatar = 'https://cdn.bsky.app/img/avatar/plain/default-avatar.jpeg';
  const maxUnfollowsPerDay = 500;

  const toUnfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const bulkUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter(actor => actor.toUnfollow).slice(0, maxUnfollowsPerDay);

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      try {
        await agent.deleteFollow(actor.followUri);
        toast.success(`Unfollowed: ${actor.displayName || actor.did} (${i + 1}/${toUnfollows.length})`);
      } catch (error) {
        console.error(`Failed to unfollow ${actor.displayName || actor.did}:`, error);
        toast.error(`Failed to unfollow ${actor.displayName || actor.did}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to avoid rate limits
    }
  };

  const getAgent = async () => {
    if (skyAgent) return skyAgent;
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    try {
      await agent.login({ identifier: username, password });
      skyAgent = agent;
      toast.success('Connected successfully');
      return agent;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Use your BlueSky App Password instead.');
      return null;
    }
  };

  const handleFormSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);

    const agent = await getAgent();
    if (!agent) {
      setIsLoading(false);
      return;
    }

    let fetchedFollowings = [];
    let cursor = null;

    try {
      for (let i = 0; i < 15 && (cursor || i === 0); i++) {
        const { data } = await agent.getFollows({ actor: username, limit: 100, cursor });
        fetchedFollowings = [...fetchedFollowings, ...data.follows];
        cursor = data.cursor;
        if (!cursor) break;
      }

      const uniqueFollowings = fetchedFollowings.filter(
        (actor, index, self) => self.findIndex(t => t.did === actor.did) === index
      );

      setFollowings(
        uniqueFollowings.map(follow => ({
          ...follow,
          toUnfollow: false,
          followUri: follow.uri, // Store the URI for unfollowing
        }))
      );
    } catch (error) {
      console.error('Failed to fetch followings:', error);
      toast.error('Failed to fetch followings');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToUnfollow = (status, did) => {
    if (did === 'all') {
      const updatedFollowings = filteredFollowings.map(actor => ({ ...actor, toUnfollow: status }));
      setFollowings(prevFollowings =>
        [...updatedFollowings, ...prevFollowings].filter(
          (actor, index, self) => self.findIndex(t => t.did === actor.did) === index
        )
      );
    } else {
      setFollowings(prevFollowings =>
        prevFollowings.map(actor =>
          actor.did === did ? { ...actor, toUnfollow: status } : actor
        )
      );
    }
  };

  return (
    <>
      <div className="text-3xl mt-10 text-center">
        BlueWave Auto-Unfollow Bot 🦋
        <div className="text-sm text-gray-300">Unfollow multiple users at once</div>
      </div>
      <form onSubmit={handleFormSubmit} className="flex m-auto bg-blue-50 flex-col p-10 max-w-[600px] mt-10 rounded shadow-xl">
        <div className="flex bg-white mb-5 p-5 rounded">
          Fetch your followings and bulk unfollow them easily.
        </div>
        <div className="flex flex-row justify-between mb-5 items-center">
          <div className="left mr-5">Username</div>
          <div className="right">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="user.bsky.social"
              required
            />
          </div>
        </div>
        <div className="flex flex-row justify-between mb-5 items-center">
          <div className="left mr-5">App Password</div>
          <div className="right">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="abcd-efgh-hijl-mnop"
              required
            />
          </div>
        </div>
        <button className="bg-white p-2 mt-5 blue" type="submit" disabled={isLoading}>
          {isLoading ? 'Fetching...' : 'Fetch Followings'}
        </button>
      </form>
      {followings.length > 0 && (
        <div className="mt-5 max-w-[600px] border m-auto rounded shadow-lg p-5">
          <div className="keywords w-full flex flex-row justify-between items-center mb-5 sticky top-1 bg-white z-50">
            <input
              type="text"
              className="w-full mr-2"
              placeholder="Filter keyword"
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
            />
            <button className="gray" onClick={() => toggleToUnfollow(true, 'all')}>
              Select All
            </button>
            <button className="ml-1 gray" onClick={() => toggleToUnfollow(false, 'all')}>
              Deselect All
            </button>
            <button className="ml-1 blue" onClick={bulkUnfollow} disabled={toUnfollowCount < 1}>
              Unfollow ({toUnfollowCount}/{maxUnfollowsPerDay})
            </button>
          </div>
          {filteredFollowings.map(actor => (
            <div key={actor.did} className="flex flex-row justify-between mb-5 border-t-2 pt-5 border-dashed group">
              <div className="w-[50px]">
                <img
                  className="w-[48px] h-[48px] rounded-full shadow"
                  src={actor.avatar || default_avatar}
                  alt={actor.displayName}
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src = default_avatar;
                  }}
                />
              </div>
              <div className="flex-1 px-2">
                <div className="text-black group-hover:text-blue-500 transition-all duration-200">
                  {actor.displayName || actor.handle}
                </div>
                <div className="text-xs text-gray-500">{actor.description}</div>
              </div>
              <div className="w-[50px]">
                <input
                  type="checkbox"
                  checked={actor.toUnfollow || false}
                  onChange={e => toggleToUnfollow(e.target.checked, actor.did)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <Toaster position="bottom-center" />
    </>
  );
}

export default App;
