import { useState, useMemo } from 'react';
import './App.scss';
import { BskyAgent } from '@atproto/api';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  let skyAgent = false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [startFollowingAccount, setStartFollowingAccount] = useState('');
  const [followings, setFollowings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnfollowMode, setIsUnfollowMode] = useState(false);

  const default_avatar = 'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg';

  const toFollowCount = useMemo(() => {
    return followings.filter(actor => actor.toFollow).length;
  }, [followings]);

  const toUnfollowCount = useMemo(() => {
    return followings.filter(actor => actor.toUnfollow).length;
  }, [followings]);

  const maxUnfollowsPerDay = 500;

  const bulkFollow = async () => {
    const agent = await getAgent();
    const toFollows = followings.filter(actor => actor.toFollow);

    for (let i = 0; i < toFollows.length; i++) {
      const actor = toFollows[i];
      try {
        const { uri } = await agent.follow(actor.did);
        console.log(uri);
        toast.success(`Followed: ${actor.displayName || actor.did} (${i + 1}/${toFollows.length})`);
      } catch (error) {
        console.error(`Failed to follow ${actor.displayName || actor.did}:`, error.message);
        toast.error(`Failed to follow ${actor.displayName || actor.did}: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
    }
  };

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
      toast.success('Connected, wait a moment...');
      skyAgent = agent;
      return agent;
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Use your app password, not your account password.');
    }
  };

  const handleFetchFollowings = async () => {
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
        const { data } = await agent.getFollows({ actor: startFollowingAccount, limit: 100, cursor });
        followed = [...followed, ...(data.follows || [])];
        cursor = data.cursor || null;
      } while (cursor && attempt < maxFetchAttempts);

      followed = followed.filter((actor, index, self) => self.findIndex(t => t.did === actor.did) === index);
      setFollowings(followed.map(actor => ({ ...actor, toFollow: false, toUnfollow: false })));
      toast.success('Fetched followings successfully.');
    } catch (error) {
      console.error('Failed to fetch followings:', error.message);
      toast.error('Failed to fetch followings. Please check the username and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleToFollow = (status, did) => {
    setFollowings(prev =>
      prev.map(actor => (actor.did === did || did === 'all' ? { ...actor, toFollow: status } : actor))
    );
  };

  const toggleToUnfollow = (status, did) => {
    setFollowings(prev =>
      prev.map(actor => (actor.did === did || did === 'all' ? { ...actor, toUnfollow: status } : actor))
    );
  };

  return (
    <>
      <div className="text-3xl mt-10 text-center">VISIONARY MANAGEMENT AUTOUNFOLLOW BOT 🦋
        <div className="text-sm text-gray-300">Unfollow multiple users at once</div>
      </div>
      <form className="flex flex-col p-10 max-w-[600px] mt-10 m-auto rounded shadow-xl bg-blue-50">
        <div className="flex flex-row justify-between mb-5">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="user.bsky.social" />
        </div>
        <div className="flex flex-row justify-between mb-5">
          <label>App Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="abcd-efgh-hijk-lmno" />
        </div>
        <div className="flex flex-row justify-between mb-5">
          <label>Target Username</label>
          <input type="text" value={startFollowingAccount} onChange={e => setStartFollowingAccount(e.target.value)} placeholder="user.bsky.social" />
        </div>
        <div className="flex justify-between">
          <button type="button" onClick={handleFetchFollowings} disabled={isLoading}>
            {isUnfollowMode ? 'Fetch Followed Users' : 'Fetch Followings'}
          </button>
          <button type="button" onClick={isUnfollowMode ? bulkUnfollow : bulkFollow} disabled={isLoading}>
            {isUnfollowMode ? `Unfollow (${toUnfollowCount})` : `Follow (${toFollowCount})`}
          </button>
        </div>
        <div className="mt-5">
          <label>
            <input type="checkbox" checked={isUnfollowMode} onChange={e => setIsUnfollowMode(e.target.checked)} />
            Enable Unfollow Mode
          </label>
        </div>
      </form>
      <Toaster position="bottom-center" />
    </>
  );
}

export default App;
