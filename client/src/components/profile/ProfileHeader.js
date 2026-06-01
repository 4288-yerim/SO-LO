// 프로필 상단 영역

import React from "react";
import { Bell } from "lucide-react";

function ProfileHeader({
  profile,
  isMyProfile,
  canViewFollowInfo,
  getRelationBadgeLabel,
  openFollowModal,
  openEditModal
}) {
  return (
    <section className="profile-header">
      <div className="profile-left">
        <div className="profile-avatar">
          {profile.profileImg ? (
            <img
              src={profile.profileImg}
              alt="프로필"
              className="profile-avatar-img"
            />
          ) : (
            <div className="profile-avatar-empty">
              {profile.userNickname ? profile.userNickname.slice(0, 1) : "?"}
            </div>
          )}
        </div>

        <div className="profile-info">
          <div className="profile-name-row">
            <h2>{profile.userNickname}</h2>

            <span className={`relation-badge badge-${profile.relationBadge}`}>
              {getRelationBadgeLabel(profile.relationBadge)}
            </span>
          </div>

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

          <button
            type="button"
            className="profile-stat-btn"
            onClick={() => {
              if (!canViewFollowInfo) return;
              openFollowModal("followers");
            }}
          >
            <strong>
              {canViewFollowInfo ? profile.followerCount : "?"}
            </strong>
            <span>팔로워</span>
          </button>

          <button
            type="button"
            className="profile-stat-btn"
            onClick={() => {
              if (!canViewFollowInfo) return;
              openFollowModal("followings");
            }}
          >
            <strong>
              {canViewFollowInfo ? profile.followingCount : "?"}
            </strong>
            <span>팔로잉</span>
          </button>
        </div>

        <div className="profile-actions">
          {isMyProfile ? (
            <button className="profile-main-btn" onClick={openEditModal}>프로필 수정</button>
          ) : (
            <button className="profile-main-btn">팔로잉</button>
          )}

          {!isMyProfile && (
            <button className="profile-noti-btn" type="button">
              <Bell size={18} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProfileHeader;