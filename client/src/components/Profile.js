import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import { authFetch } from "./routes/authFetch";
import "../css/Profile.css";

function Profile() {
  const { userId } = useParams();

  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("posts");

  const token = localStorage.getItem("token");
  let loginUserId = "";

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      loginUserId = payload.userId;
    } catch (err) {
      console.error("Token decode error:", err);
    }
  }

  const isMyProfile = loginUserId === userId;

  useEffect(() => {
    authFetch(`http://localhost:3010/profile/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setProfile(data.profile);
        } else {
          setMessage(data.message || "프로필을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("Profile load error:", err);
        setMessage("프로필을 불러오지 못했습니다.");
      });
  }, [userId]);

  if (message) {
    return (
      <div className="profile-layout">
        <Sidebar />
        <main className="profile-page">
          <div className="profile-message">{message}</div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-layout">
        <Sidebar />
        <main className="profile-page">
          <div className="profile-message">프로필을 불러오는 중입니다.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      <Sidebar />

      <main className="profile-page">
        <section className="profile-header">
          <div className="profile-left">
            <div className="profile-avatar">
              {profile.userNickname?.charAt(0)}
            </div>

            <div className="profile-info">
              <h2>{profile.userNickname}</h2>
              <p className="profile-user-id"></p>
              <p className="profile-intro">
                {profile.userIntro || "아직 소개글이 없습니다."}
              </p>
            </div>
          </div>

          <div className="profile-right">
            <div className="profile-stats">
              <div>
                <strong>{profile.postCount}</strong>
                <span>게시글</span>
              </div>
              <div>
                <strong>{profile.followerCount}</strong>
                <span>팔로워</span>
              </div>
              <div>
                <strong>{profile.followingCount}</strong>
                <span>팔로잉</span>
              </div>
            </div>

            <div className="profile-actions">
              {isMyProfile ? (
                <button className="profile-main-btn">
                  프로필 수정
                </button>
              ) : (
                <button className="profile-main-btn">
                  팔로잉
                </button>
              )}

              <button className="profile-sub-btn">
                프로필 공유
              </button>
            </div>
          </div>
        </section>

        <section className="profile-tabs">
          <button
            className={activeTab === "posts" ? "active" : ""}
            onClick={() => setActiveTab("posts")}
          >
            작성한 기록
          </button>

          <button
            className={activeTab === "likes" ? "active" : ""}
            onClick={() => setActiveTab("likes")}
          >
            좋아요한 글
          </button>

          <button
            className={activeTab === "solog" ? "active" : ""}
            onClick={() => setActiveTab("solog")}
          >
            SO:LOG
          </button>
        </section>

        {activeTab === "posts" && (
          <section className="profile-post-section">
            {profile.postList.length === 0 ? (
              <div className="profile-empty">
                아직 작성한 기록이 없습니다.
              </div>
            ) : (
              <div className="profile-post-grid">
                {profile.postList.map((post) => (
                  <article className="profile-post-card" key={post.postId}>
                    {post.imageUrl ? (
                      post.fileType === "VDO" ? (
                        <video
                          src={post.imageUrl}
                          className="profile-post-media"
                          muted
                        />
                      ) : (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="profile-post-media"
                        />
                      )
                    ) : (
                      <div className="profile-post-no-media">
                        SO:LO
                      </div>
                    )}

                    <div className="profile-post-body">
                      <h4>{post.title}</h4>
                      <p>{post.content}</p>

                      {post.placeName && (
                        <span className="profile-post-place">
                          {post.placeName}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "likes" && (
          <div className="profile-empty">
            좋아요한 글은 다음 단계에서 연결할 예정입니다.
          </div>
        )}

        {activeTab === "solog" && (
          <div className="profile-empty">
            SO:LOG는 다음 단계에서 연결할 예정입니다.
          </div>
        )}
      </main>
    </div>
  );
}

export default Profile;