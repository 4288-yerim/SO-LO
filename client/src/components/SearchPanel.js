import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./routes/authFetch";

function SearchPanel({ open, onClose }) {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState("");
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setUserList([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);

      authFetch(
        `http://localhost:3010/profile/search/user?keyword=${encodeURIComponent(
          trimmedKeyword
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.result === "success") {
            setUserList(data.list || []);
          }
        })
        .catch((err) => {
          console.error("User search error:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword, open]);

  function moveProfile(userId) {
    onClose();
    navigate(`/so:lo/profile/${userId}`);
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
          placeholder="닉네임 또는 소개글 검색"
          autoFocus
        />
      </div>

      <div className="search-result-list">
        {loading && <div className="search-empty">검색 중...</div>}

        {!loading && keyword.trim() && userList.length === 0 && (
          <div className="search-empty">검색 결과가 없습니다.</div>
        )}

        {!loading &&
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
      </div>
    </div>
  );
}

export default SearchPanel;