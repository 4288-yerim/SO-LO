// 프로필 상단 영역

import React, { useEffect, useRef, useState } from "react";
import {
  Loader2,
  MessageCircle,
  MoreHorizontal
} from "lucide-react";

function ProfileHeader({
  profile,
  isMyProfile,
  canViewFollowInfo,
  getRelationBadgeLabel,
  openFollowModal,
  openEditModal,
  toggleFollow,
  followLoading,
  openDmRoom
})
{
  const [openMenu, setOpenMenu] = useState(false);

  const canShowDmButton =
    !isMyProfile &&
    (
      profile.accountVisible === "PUB" ||
      profile.followStatus === "FOLLOWING"
    );

  const moreMenuRef = useRef(null);

  useEffect(() => {
    const closeMoreMenu = (e) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(e.target)
      ) {
        setOpenMenu(false);
      }
    };

    document.addEventListener("mousedown", closeMoreMenu);

    return () => {
      document.removeEventListener("mousedown", closeMoreMenu);
    };
  }, []);

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
            <button
              className="profile-main-btn"
              onClick={openEditModal}
            >
              프로필 수정
            </button>
          ) : (
            <button
              className={`profile-main-btn ${
                profile.followStatus === "FOLLOWING"
                  ? "following-btn"
                  : profile.followStatus === "REQUESTED"
                    ? "requested-btn"
                    : "follow-btn"
              }`}
              onClick={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 size={16} className="follow-loading-icon" />
              ) : profile.followStatus === "FOLLOWING" ? (
                "팔로잉"
              ) : profile.followStatus === "REQUESTED" ? (
                "요청 중"
              ) : (
                "팔로우"
              )}
            </button>
          )}

          <>
            {canShowDmButton && (
              <button
                className="profile-dm-btn"
                type="button"
                title="메시지 보내기"
                onClick={openDmRoom}
              >
                <MessageCircle size={18} />
              </button>
            )}

            <div className="profile-more-wrap" ref={moreMenuRef}>
              <button
                className="profile-more-btn"
                type="button"
                title="더보기"
                onClick={() => setOpenMenu(!openMenu)}
              >
                <MoreHorizontal size={18} />
              </button>

              {openMenu && (
                <div className="profile-more-menu">
                  <button type="button">
                    공유
                  </button>

                  <button type="button">
                    차단
                  </button>

                  <button
                    type="button"
                    className="danger"
                  >
                    신고
                  </button>
                </div>
              )}
            </div>
          </>
        </div>
      </div>
    </section>
  );
}

export default ProfileHeader;