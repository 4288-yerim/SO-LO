// 프로필 상단 영역

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../routes/authFetch";
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
  openDmRoom,
  blockUser
})
{
  const [openMenu, setOpenMenu] = useState(false);
  const navigate = useNavigate();

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [reportMessage, setReportMessage] = useState("");

  const [shareModalOpen, setShareModalOpen] = useState(false);

  function openReportModal() {
    setOpenMenu(false);
    setReportReason("");
    setReportDetail("");
    setReportMessage("");
    setReportModalOpen(true);
  }

  function submitReport() {
    if (!reportReason) {
      setReportMessage("신고 사유를 선택해주세요.");
      return;
    }

    authFetch("http://localhost:3010/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        targetType: "USR",
        targetId: profile.userId,
        targetNo: null,
        reason: reportReason,
        detail: reportDetail
      })
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          setReportMessage(data.message || "신고 접수에 실패했습니다.");
          return;
        }

        setReportModalOpen(false);

          navigate("/so:lo/feed", {
            state: {
              toastMessage: "신고가 접수되었습니다."
            }
        });
      })
      .catch((err) => {
        console.error("User report error:", err);
        setReportMessage("신고 접수에 실패했습니다.");
      });
  }

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
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      setShareModalOpen(true);
                    }}
                  >
                    공유
                  </button>

                  {!isMyProfile && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => {
                        setOpenMenu(false);
                        blockUser();
                      }}
                    >
                      차단
                    </button>
                  )}

                  {!isMyProfile && (
                    <button
                      type="button"
                      className="danger"
                      onClick={openReportModal}
                    >
                      신고
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        </div>
      </div>

      {shareModalOpen && (
        <div
          className="report-modal-backdrop"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>공유</h3>

            <p className="ready">
              기능 준비중입니다.
            </p>

            <div className="delete-post-modal-actions">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModalOpen && (
        <div
          className="report-modal-backdrop"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            className="report-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>신고하기</h3>

            <select
              value={reportReason}
              onChange={(e) => {
                setReportReason(e.target.value);
                setReportMessage("");
              }}
            >
              <option value="">신고 사유 선택</option>
              <option value="부적절한 프로필">부적절한 프로필</option>
              <option value="사칭">사칭</option>
              <option value="괴롭힘/비방">괴롭힘/비방</option>
              <option value="음란/선정적 내용">음란/선정적 내용</option>
              <option value="허위 정보">허위 정보 </option>
              <option value="기타">기타</option>
            </select>

            <textarea
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              placeholder="상세 내용을 입력해주세요."
              maxLength={500}
            />

            {reportMessage && (
              <p className="delete-post-modal-message">
                {reportMessage}
              </p>
            )}

            <div className="delete-post-modal-actions">
              <button type="button" onClick={() => setReportModalOpen(false)}>
                취소
              </button>

              <button type="button" onClick={submitReport}>
                신고
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProfileHeader;