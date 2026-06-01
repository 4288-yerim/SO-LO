import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { authFetch } from "./routes/authFetch";
import ProfileHeader from "./profile/ProfileHeader";
import ProfileTabs from "./profile/ProfileTabs";
import ProfilePostGrid from "./profile/ProfilePostGrid";
import FollowModal from "./profile/FollowModal";
import PostDetailModal from "./feed/PostDetailModal";
import ProfileEditModal from "./profile/ProfileEditModal";
import "../css/profile/ProfileEditModal.css";
import "../css/feed/PostDetailModal.css";
import "../css/Profile.css";
import "../css/profile/ProfileHeader.css";
import "../css/profile/ProfileTabs.css";
import "../css/profile/ProfileGrid.css";
import "../css/profile/FollowModal.css";

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [selectedPost, setSelectedPost] = useState(null);
  const [detailFileIndex, setDetailFileIndex] = useState(0);
  const [commentList, setCommentList] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [openReplyMap, setOpenReplyMap] = useState({});
  const [openCommentMenu, setOpenCommentMenu] = useState(null);
  const commentAreaRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const [followModalType, setFollowModalType] = useState(null);
  const [followList, setFollowList] = useState([]);
  const [followMessage, setFollowMessage] = useState("");
  const [likedPostList, setLikedPostList] = useState([]);
  const [likedPostLoaded, setLikedPostLoaded] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [canViewFollowInfo, setCanViewFollowInfo] = useState(true);

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

  const openFollowModal = (type) => {
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

  const loadLikedPostList = () => {
  if (likedPostLoaded) return;

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

  const updateProfileState = (updatedProfile) => {
    setProfile((prev) => ({
      ...prev,
      ...updatedProfile
    }));
  };

  useEffect(() => {
    setLikedPostList([]);
    setLikedPostLoaded(false);
    setActiveTab("posts");

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
        <ProfileHeader
          profile={profile}
          isMyProfile={isMyProfile}
          canViewFollowInfo={canViewFollowInfo}
          getRelationBadgeLabel={getRelationBadgeLabel}
          openFollowModal={openFollowModal}
          openEditModal={() => setEditModalOpen(true)}
        />
        
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);

            if (tab === "likes") {
              loadLikedPostList();
            }
          }}
        />

        {activeTab === "posts" && (
          <ProfilePostGrid
            postList={profile.postList}
            emptyText="아직 작성한 기록이 없습니다."
            onPostClick={openProfilePostDetail}
          />
        )}

        {activeTab === "likes" && (
          <ProfilePostGrid
            postList={likedPostList}
            emptyText="좋아요한 글이 없습니다."
            onPostClick={openProfilePostDetail}
          />
        )}

        {activeTab === "solog" && (
          <div className="profile-empty">
            SO:LOG는 다음 단계에서 연결할 예정입니다.
          </div>
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
            getTimeAgo={getTimeAgo}
            getShortAddress={getShortAddress}
            navigate={navigate}
          />
        )}

      </main>
    </div>
  );
}

export default Profile;