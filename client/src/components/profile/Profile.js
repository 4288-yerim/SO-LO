import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import { authFetch } from "../routes/authFetch";

import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import ProfilePostGrid from "./ProfilePostGrid";
import FollowModal from "./FollowModal";
import ProfileEditModal from "./ProfileEditModal";
import PostDetailModal from "../feed/PostDetailModal";

import "../../css/profile/ProfileEditModal.css";
import "../../css/feed/PostDetailModal.css";
import "../../css/Profile.css";
import "../../css/profile/ProfileHeader.css";
import "../../css/profile/ProfileTabs.css";
import "../../css/profile/ProfileGrid.css";
import "../../css/profile/FollowModal.css";

function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("posts");

  const [postList, setPostList] = useState([]);
  const [postLoaded, setPostLoaded] = useState(false);

  const [likedPostList, setLikedPostList] = useState([]);
  const [likedPostLoaded, setLikedPostLoaded] = useState(false);

  const [sologList, setSologList] = useState([]);
  const [sologLoaded, setSologLoaded] = useState(false);

  const [canViewProfileContents, setCanViewProfileContents] = useState(true);

  const [followModalType, setFollowModalType] = useState(null);
  const [followList, setFollowList] = useState([]);
  const [followMessage, setFollowMessage] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [selectedPost, setSelectedPost] = useState(null);
  const [detailFileIndex, setDetailFileIndex] = useState(0);
  const [commentList, setCommentList] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [openReplyMap, setOpenReplyMap] = useState({});
  const [openCommentMenu, setOpenCommentMenu] = useState(null);

  const commentAreaRef = useRef(null);

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
  const [followLoading, setFollowLoading] = useState(false);

  const getRelationBadgeLabel = (badge) => {
    switch (badge) {
      case "ALL":
        return "편한 대화";
      case "FLW":
        return "천천히";
      case "OFF":
        return "혼자 선호";
      default:
        return "편한 대화";
    }
  };

  const loadPostList = () => {
    if (postLoaded || !canViewProfileContents) return;

    authFetch(`http://localhost:3010/profile/${userId}/posts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPostList(data.postList);
          setPostLoaded(true);
        } else {
          setMessage(data.message || "작성한 글을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("Profile post load error:", err);
        setMessage("작성한 글을 불러오지 못했습니다.");
      });
  };

  const loadLikedPostList = () => {
    if (likedPostLoaded || !canViewProfileContents) return;

    authFetch(`http://localhost:3010/profile/${userId}/likes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setLikedPostList(data.likedPostList);
          setLikedPostLoaded(true);
        } else {
          setMessage(data.message || "좋아요한 글을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("Liked post load error:", err);
        setMessage("좋아요한 글을 불러오지 못했습니다.");
      });
  };

  const loadSologList = () => {
    if (sologLoaded || !canViewProfileContents) return;

    authFetch(`http://localhost:3010/profile/${userId}/solog`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setSologList(data.sologList);
          setSologLoaded(true);
        } else {
          setMessage(data.message || "SO:LOG를 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("SO:LOG load error:", err);
        setMessage("SO:LOG를 불러오지 못했습니다.");
      });
  };

  const openFollowModal = (type) => {
    if (!canViewProfileContents) return;

    setFollowModalType(type);
    setFollowList([]);
    setFollowMessage("");

    authFetch(`http://localhost:3010/profile/${userId}/${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setFollowList(data.list);
        } else {
          setFollowMessage(data.message || "목록을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("Follow list load error:", err);
        setFollowMessage("목록을 불러오지 못했습니다.");
      });
  };

  const closeFollowModal = () => {
    setFollowModalType(null);
    setFollowList([]);
    setFollowMessage("");
  };

  function getTimeAgo(dateValue) {
    const createdTime = new Date(dateValue);
    const now = new Date();

    const diffMs = now - createdTime;
    const diffMin = Math.floor(diffMs / 1000 / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay < 7) return `${diffDay}일 전`;

    return createdTime.toLocaleDateString("ko-KR");
  }

  function getShortAddress(address) {
    if (!address) return "";

    const parts = address.split(" ");
    return `${parts[0]} ${parts[1]}`;
  }

  function loadComments(postNo) {
    authFetch(`http://localhost:3010/feed/${postNo}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setCommentList(data.commentList);
        }
      })
      .catch((err) => {
        console.error("댓글 불러오기 실패:", err);
      });
  }

  function openProfilePostDetail(post) {
    setSelectedPost({
      ...post,
      userId: post.userId || profile.userId,
      userNickname: post.userNickname || profile.userNickname,
      userProfileImg: profile.profileImg,
      tags: post.tags || [],
      cmtYn: post.cmtYn || "N",
      location: post.location || post.placeName || "",
      locationAddress: post.locationAddress || post.placeAddress || "",
      files:
        post.files && post.files.length > 0
          ? post.files
          : [
              {
                fileUrl: post.imageUrl,
                fileType: post.fileType
              }
            ]
    });

    setDetailFileIndex(0);
    setCommentInput("");
    setReplyTarget(null);
    setOpenReplyMap({});
    setOpenCommentMenu(null);

    if (post.cmtYn === "Y") {
      loadComments(post.postId);
    } else {
      setCommentList([]);
    }
  }

  function submitComment() {
    if (!commentInput.trim()) return;

    authFetch("http://localhost:3010/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postNo: selectedPost.postId,
        content: commentInput,
        parentCommentNo: replyTarget ? replyTarget.commentNo : null,
        mentionUserId: replyTarget ? replyTarget.userId : null
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setCommentInput("");
          setReplyTarget(null);
          loadComments(selectedPost.postId);
        }
      })
      .catch((err) => {
        console.error("댓글 등록 실패:", err);
      });
  }

  function toggleLike(post) {
    authFetch("http://localhost:3010/feed/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postNo: post.postId
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") return;

        setSelectedPost((prev) => {
          if (!prev || prev.postId !== post.postId) return prev;

          return {
            ...prev,
            likedYn: data.likedYn,
            likeCount: data.likedYn
              ? (prev.likeCount || 0) + 1
              : Math.max((prev.likeCount || 0) - 1, 0)
          };
        });
      })
      .catch((err) => {
        console.error("좋아요 처리 실패:", err);
      });
  }

  const updateProfileState = (updatedProfile) => {
    setProfile((prev) => ({
      ...prev,
      ...updatedProfile
    }));
  };

  const toggleFollow = async () => {
    if (followLoading) return;

    try {
      setFollowLoading(true);

      const res = await authFetch(
        `http://localhost:3010/profile/${userId}/follow`,
        {
          method: "POST"
        }
      );

      const data = await res.json();

      if (data.result !== "success") {
        setFollowLoading(false);
        return;
      }

      setProfile((prev) => {
        let nextFollowerCount = prev.followerCount;

        if (prev.followStatus === "NONE" && data.followStatus === "FOLLOWING") {
          nextFollowerCount += 1;
        }

        if (prev.followStatus === "FOLLOWING" && data.followStatus === "NONE") {
          nextFollowerCount = Math.max(nextFollowerCount - 1, 0);
        }

        return {
          ...prev,
          isFollowing: data.isFollowing,
          followStatus: data.followStatus,
          followerCount: nextFollowerCount
        };
      });

      setTimeout(() => {
        setFollowLoading(false);
      }, 700);
    } catch (err) {
      console.error("Follow toggle error:", err);
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    setProfile(null);
    setMessage("");
    setActiveTab("posts");

    setPostList([]);
    setPostLoaded(false);
    setLikedPostList([]);
    setLikedPostLoaded(false);
    setSologList([]);
    setSologLoaded(false);

    authFetch(`http://localhost:3010/profile/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setProfile(data.profile);
          setCanViewProfileContents(data.canViewProfileContents);

          if (data.canViewProfileContents) {
            authFetch(`http://localhost:3010/profile/${userId}/posts`)
              .then((res) => res.json())
              .then((postData) => {
                if (postData.result === "success") {
                  setPostList(postData.postList);
                  setPostLoaded(true);
                }
              });
          }
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
        <ProfileHeader
          profile={profile}
          isMyProfile={isMyProfile}
          canViewFollowInfo={canViewProfileContents}
          getRelationBadgeLabel={getRelationBadgeLabel}
          openFollowModal={openFollowModal}
          openEditModal={() => setEditModalOpen(true)}
          toggleFollow={toggleFollow}
          followLoading={followLoading}
        />

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);

            if (tab === "posts") {
              loadPostList();
            }

            if (tab === "likes") {
              loadLikedPostList();
            }

            if (tab === "solog") {
              loadSologList();
            }
          }}
        />

        {activeTab === "posts" && (
          canViewProfileContents ? (
            <ProfilePostGrid
              postList={postList}
              emptyText="아직 작성한 기록이 없습니다."
              onPostClick={openProfilePostDetail}
            />
          ) : (
            <div className="profile-empty">
              비공개 계정입니다. 팔로우하면 작성한 기록을 볼 수 있어요.
            </div>
          )
        )}

        {activeTab === "likes" && (
          canViewProfileContents ? (
            <ProfilePostGrid
              postList={likedPostList}
              emptyText="좋아요한 글이 없습니다."
              onPostClick={openProfilePostDetail}
            />
          ) : (
            <div className="profile-empty">
              비공개 계정입니다. 팔로우하면 좋아요한 글을 볼 수 있어요.
            </div>
          )
        )}

        {activeTab === "solog" && (
          canViewProfileContents ? (
            <div className="profile-empty">
              SO:LOG는 다음 단계에서 연결할 예정입니다.
            </div>
          ) : (
            <div className="profile-empty">
              비공개 계정입니다. 팔로우하면 SO:LOG를 볼 수 있어요.
            </div>
          )
        )}

        <FollowModal
          followModalType={followModalType}
          followList={followList}
          followMessage={followMessage}
          closeFollowModal={closeFollowModal}
          getRelationBadgeLabel={getRelationBadgeLabel}
        />

        {editModalOpen && (
          <ProfileEditModal
            profile={profile}
            onClose={() => setEditModalOpen(false)}
            onUpdate={updateProfileState}
          />
        )}

        {selectedPost && (
          <PostDetailModal
            selectedPost={selectedPost}
            setSelectedPost={setSelectedPost}
            detailFileIndex={detailFileIndex}
            setDetailFileIndex={setDetailFileIndex}
            commentList={commentList}
            commentInput={commentInput}
            setCommentInput={setCommentInput}
            replyTarget={replyTarget}
            setReplyTarget={setReplyTarget}
            openReplyMap={openReplyMap}
            setOpenReplyMap={setOpenReplyMap}
            openCommentMenu={openCommentMenu}
            setOpenCommentMenu={setOpenCommentMenu}
            commentAreaRef={commentAreaRef}
            submitComment={submitComment}
            toggleLike={toggleLike}
            getTimeAgo={getTimeAgo}
            getShortAddress={getShortAddress}
            navigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

export default ProfilePage;