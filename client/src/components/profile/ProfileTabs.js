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
        className={activeTab === "favorites" ? "active" : ""}
        onClick={() => setActiveTab("favorites")}
      >
        찜 업체
      </button>
    </section>
  );
}

export default ProfileTabs;