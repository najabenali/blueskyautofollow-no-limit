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

  const defaultAvatar =
    "https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6r22z27h6tvur/bafkreihagr2cmvl2jt4mgx3sppwe2it3fwolkrbtjrhcnwjk4jdijhsoze@jpeg";

  const toUnfollowCount = useMemo(
    () => followings.filter((actor) => actor.toUnfollow).length,
    [followings]
  );

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
      toast.success("Logged in successfully!");
      skyAgent = agent;
      return agent;
    } catch (error) {
      console.error("Login failed:", error);
      toast.error(
        "Login failed. Ensure you are using the app password, not the account password."
      );
      return null;
    }
  };

  const handleFetchFollowings = async () => {
    setIsLoading(true);
    const agent = await getAgent();
    if (!agent) return;

    try {
      const max = 1000;
      let cursor = null;
      let allFollowings = [];

      for (let i = 0; i < max; i++) {
        const { data } = await agent.getFollows({
          actor: username,
          limit: 100,
          cursor,
        });

        if (data.follows) {
          allFollowings = [...allFollowings, ...data.follows];
          cursor = data.cursor;
        } else {
          break;
        }
      }

      setFollowings(
        allFollowings.map((actor) => ({
          ...actor,
          toUnfollow: false,
        }))
      );
      toast.success("Followings list fetched successfully!");
    } catch (error) {
      console.error("Error fetching followings:", error);
      toast.error("Failed to fetch followings.");
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
        await agent.unfollow(actor.did);
        toast.success(`Unfollowed: ${actor.displayName || actor.handle}`);
      } catch (error) {
        console.error(`Failed to unfollow ${actor.did}:`, error);
        toast.error(`Failed to unfollow: ${actor.displayName || actor.handle}`);
      }
    }

    setFollowings((prevFollowings) =>
      prevFollowings.filter((actor) => !actor.toUnfollow)
    );
  };

  const toggleToUnfollow = (status, did) => {
    if (did === "all") {
      setFollowings((prevFollowings) =>
        prevFollowings.map((actor) => ({ ...actor, toUnfollow: status }))
      );
    } else {
      setFollowings((prevFollowings) =>
        prevFollowings.map((actor) =>
          actor.did === did ? { ...actor, toUnfollow: status } : actor
        )
      );
    }
  };

  return (
    <div className="app">
      <h1 className="title">BlueWave Unfollower 🦋</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleFetchFollowings();
        }}
        className="form"
      >
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
            placeholder="abcd-efgh-hijl-mnop"
            required
          />
        </div>
        <button type="submit" className="button blue" disabled={isLoading}>
          Fetch Followings
        </button>
      </form>

      <div className="list">
        {followings.map((actor) => (
          <div key={actor.did} className="list-item">
            <img
              src={actor.avatar || defaultAvatar}
              alt={actor.displayName}
              className="avatar"
            />
            <div className="info">
              <h3>{actor.displayName || actor.handle}</h3>
              <p>{actor.description}</p>
            </div>
            <div>
              <input
                type="checkbox"
                checked={actor.toUnfollow || false}
                onChange={(e) =>
                  toggleToUnfollow(e.target.checked, actor.did)
                }
              />
            </div>
          </div>
        ))}
      </div>

      {followings.length > 0 && (
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
            className="button red"
            onClick={handleUnfollow}
            disabled={toUnfollowCount < 1}
          >
            Unfollow ({toUnfollowCount})
          </button>
        </div>
      )}

      <Toaster position="bottom-center" />
    </div>
  );
}

export default App;
