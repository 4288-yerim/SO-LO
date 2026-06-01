// 팔로워/ 팔로잉 클릭했을 때 뜨는 모달 담당.

import React from "react";

function FollowModal({
  followModalType,
  followList,
  followMessage,
  closeFollowModal,
  getRelationBadgeLabel
}) {
  if (!followModalType) {
    return null;
  }

  return (
    <div className="follow-modal-backdrop">
      <div className="follow-modal">
        <div className="follow-modal-header">
          <h3>
            {followModalType === "followers" ? "팔로워" : "팔로잉"}
          </h3>

          <button
            type="button"
            className="follow-modal-close"
            onClick={closeFollowModal}
          >
            ×
          </button>
        </div>

        <div className="follow-modal-list">
          {followMessage ? (
            <p className="follow-modal-empty">{followMessage}</p>
          ) : followList.length === 0 ? (
            <p className="follow-modal-empty">
              {followModalType === "followers"
                ? "아직 팔로워가 없습니다."
                : "아직 팔로잉한 사용자가 없습니다."}
            </p>
          ) : (
            followList.map((user) => (
              <div className="follow-user-row" key={user.userId}>
                <div className="follow-user-avatar">
                  {user.profileImg ? (
                    <img src={user.profileImg} alt="프로필 이미지" />
                  ) : (
                    user.userNickname?.charAt(0)
                  )}
                </div>

                <div className="follow-user-info">
                  <div className="follow-user-name-row">
                    <strong>{user.userNickname}</strong>

                    <span
                      className={`relation-badge badge-${user.relationBadge}`}
                    >
                      {getRelationBadgeLabel(user.relationBadge)}
                    </span>
                  </div>

                  <span>@{user.userId}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FollowModal;