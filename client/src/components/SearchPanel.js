import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./routes/authFetch";

function SearchPanel({ open, onClose }) {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [activeTab, setActiveTab] = useState("user");
  const [userList, setUserList] = useState([]);
  const [postList, setPostList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setUserList([]);
      setPostList([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);

      const searchType = activeTab === "user" ? "user" : "post";

      authFetch(
        `http://localhost:3010/profile/search/${searchType}?keyword=${encodeURIComponent(
          trimmedKeyword
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.result !== "success") return;

          if (activeTab === "user") {
            setUserList(data.list || []);
          } else {
            setPostList(data.list || []);
          }
        })
        .catch((err) => {
          console.error("Search error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword, activeTab, open]);

  function moveProfile(userId) {
    onClose();
    navigate(`/so:lo/profile/${userId}`);
  }

  function movePost(postId) {
    onClose();

    navigate("/so:lo/feed", {
      state: {
        notificationPostNo: postId
      }
    });
  }

  if (!open) return null;

  return (
    <div className="search-panel">
      <div className="search-panel-header">
        <h3>검색</h3>

        <button type="button" className="search-panel-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="search-input-box">
        <Search size={18} />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="검색"
          autoFocus
        />
      </div>

      <div className="search-tab-row">
        <button
          type="button"
          className={activeTab === "user" ? "active" : ""}
          onClick={() => setActiveTab("user")}
        >
          사용자
        </button>

        <button
          type="button"
          className={activeTab === "post" ? "active" : ""}
          onClick={() => setActiveTab("post")}
        >
          기록
        </button>
      </div>

      <div className="search-result-list">
        {loading && <div className="search-empty">검색 중...</div>}

        {!loading &&
          keyword.trim() &&
          activeTab === "user" &&
          userList.length === 0 && (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}

        {!loading &&
          keyword.trim() &&
          activeTab === "post" &&
          postList.length === 0 && (
            <div className="search-empty">검색 결과가 없습니다.</div>
          )}

        {!loading &&
          activeTab === "user" &&
          userList.map((user) => (
            <button
              type="button"
              className="search-user-card"
              key={user.userId}
              onClick={() => moveProfile(user.userId)}
            >
              <div className="search-user-img-wrap">
                {user.profileImg ? (
                  <img src={user.profileImg} alt={user.userNickname} />
                ) : (
                  <div className="search-user-img-empty" />
                )}
              </div>

              <div className="search-user-info">
                <strong>{user.userNickname}</strong>
                <p>{user.userIntro || "소개글이 없습니다."}</p>
              </div>
            </button>
          ))}

        {!loading &&
          activeTab === "post" &&
          postList.map((post) => (
            <button
              type="button"
              className="search-post-card"
              key={post.postId}
              onClick={() => movePost(post.postId)}
            >
              <strong>{post.title}</strong>

              {post.fileType === "VDO" ? (
                <video src={post.imageUrl} muted />
              ) : (
                <img src={post.imageUrl} alt={post.title} />
              )}
            </button>
          ))}
      </div>
    </div>
  );
}

export default SearchPanel;