import React, { useState, useMemo } from "react";
import { BskyAgent } from "@atproto/api";
import toast, { Toaster } from "react-hot-toast";
import "./App.scss";

function App() {
  let skyAgent = false;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [followings, setFollowings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const default_avatar =
    "https://cdn.bsky.app/img/avatar/plain/default-avatar.png";

  const toUnfollowCount = useMemo(() => {
    return followings.filter((actor) => actor.toUnfollow).length;
  }, [followings]);

  const getAgent = async () => {
    if (skyAgent) return skyAgent;
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    try {
      await agent.login({
        identifier: username,
        password,
      });
      skyAgent = agent;
      toast.success("Connected to Bluesky!");
      return agent;
    } catch (error) {
      console.error(error);
      toast.error(
        "Login failed! Please use your app password from Bluesky settings."
      );
      throw error;
    }
  };

  const handleFetchFollowings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const agent = await getAgent();

    let cursor = null;
    let allFollowings = [];
    let i = 0;

    try {
      do {
        const { data } = await agent.getFollows({
          actor: username,
          limit: 100,
          cursor,
        });
        allFollowings = [...allFollowings, ...data.follows];
        cursor = data.cursor;
        i++;
      } while (cursor && i < 10); // Fetch up to 1000 users (10 pages of 100)
      setFollowings(allFollowings);
      toast.success("Fetched followings!");
    } catch (error) {
      console.error("Failed to fetch followings:", error);
      toast.error("Failed to fetch followings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async () => {
    const agent = await getAgent();
    const toUnfollows = followings.filter((actor) => actor.toUnfollow);

    if (toUnfollows.length === 0) {
      toast.error("No users selected to unfollow!");
      return;
    }

    for (let i = 0; i < toUnfollows.length; i++) {
      const actor = toUnfollows[i];
      try {
        console.log(`Attempting to unfollow: ${actor.did}`);
        await agent.unfollow(actor.did);
        toast.success(`Unfollowed: ${actor.displayName || actor.handle}`);
      } catch (error) {
        console.error(`Failed to unfollow ${actor.did}:`, error);
        toast.error(`Failed to unfollow: ${actor.displayName || actor.handle}`);
      }
    }

    // Update state to remove unfollowed users
    setFollowings((prevFollowings) =>
      prevFollowings.filter((actor) => !actor.toUnfollow)
    );
  };

  const toggleToUnfollow = (status, did) => {
    if (did === "all") {
      setFollowings((prevFollowings) =>
        prevFollowings.map((actor) => ({
          ...actor,
          toUnfollow: status,
        }))
      );
    } else {
      setFollowings((prevFollowings) =>
        prevFollowings.map((actor) =>
          actor.did === did
            ? { ...actor, toUnfollow: status }
            : actor
        )
      );
    }
  };

  return (
    <div className="app">
      <div className="header text-center">
        <h1>Bluesky Unfollow Bot</h1>
        <p>Unfollow multiple users quickly and easily!</p>
      </div>
      <form onSubmit={handleFetchFollowings} className="form">
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="user.bsky.social"
            required
          />
        </div>
        <div className="form-group">
          <label>App Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="abcd-efgh-ijkl-mnop"
            required
          />
        </div>
        <button type="submit" className="button blue" disabled={isLoading}>
          {isLoading ? "Fetching..." : "Fetch Followings"}
        </button>
      </form>
      {followings.length > 0 && (
        <div className="followings-list">
          <div className="actions">
            <button
              className="button gray"
              onClick={() => toggleToUnfollow(true, "all")}
            >
              Select All
            </button>
            <button
              className="button gray"
              onClick={() => toggleToUnfollow(false, "all")}
            >
              Deselect All
            </button>
            <button
              className="button blue"
              onClick={handleUnfollow}
              disabled={toUnfollowCount === 0}
            >
              Unfollow Selected ({toUnfollowCount})
            </button>
          </div>
          <ul>
            {followings.map((actor) => (
              <li key={actor.did} className="following-item">
                <img
                  src={actor.avatar || default_avatar}
                  alt={actor.displayName || "Avatar"}
                  className="avatar"
                />
                <div>
                  <h3>{actor.displayName || actor.handle}</h3>
                  <p>{actor.description || "No description available."}</p>
                </div>
                <input
                  type="checkbox"
                  checked={actor.toUnfollow || false}
                  onChange={(e) =>
                    toggleToUnfollow(e.target.checked, actor.did)
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
