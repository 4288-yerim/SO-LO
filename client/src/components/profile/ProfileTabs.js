// 프로필 탭 메뉴

import React from "react";

function ProfileTabs({ activeTab, setActiveTab }) {
  return (
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
  );
}

export default ProfileTabs;