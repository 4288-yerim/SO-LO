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
import { Lock } from "lucide-react";
import ProfileFavoriteModal from "./ProfileFavoriteModal";

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

  const [favoriteFolderList, setFavoriteFolderList] = useState([]);
  const [favoriteLoaded, setFavoriteLoaded] = useState(false);
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [selectedFavoriteFolder, setSelectedFavoriteFolder] = useState(null);
  const [canViewFavorites, setCanViewFavorites] = useState(true);

  const [canViewProfileContents, setCanViewProfileContents] = useState(true);

  const [followModalType, setFollowModalType] = useState(null);
  const [followList, setFollowList] = useState([]);
  const [followMessage, setFollowMessage] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  const [selectedPost, setSelectedPost] = useState(null);
  const [detailFileIndex, setDetailFileIndex] = useState(0);
  const [commentList, setCommentList] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [openReplyMap, setOpenReplyMap] = useState({});
  const [openCommentMenu, setOpenCommentMenu] = useState(null);
  const [deleteFolderModalOpen, setDeleteFolderModalOpen] = useState(false);
  const [deleteTargetFolder, setDeleteTargetFolder] = useState(null);

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

  const loadFavoriteFolderList = () => {
    if (favoriteLoaded) return;

    authFetch(`http://localhost:3010/profile/${userId}/favorites`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          const folderList = data.favoriteFolderList || [];

          setCanViewFavorites(data.canViewFavorites);
          setFavoriteFolderList(folderList);
          setFavoriteLoaded(true);

          if (folderList.length > 0) {
            setSelectedFavoriteFolder(folderList[0]);
          }
        } else {
          setMessage(data.message || "찜한 업체를 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("Favorite folder load error:", err);
        setMessage("찜한 업체를 불러오지 못했습니다.");
      });
  };

  const deleteFavoriteFolder = (folder) => {
    authFetch(`http://localhost:3010/favorite/folders/${folder.folderNo}`, {
      method: "DELETE"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "폴더 삭제에 실패했습니다.");
          return;
        }

        setFavoriteFolderList((prev) =>
          prev.filter((item) => item.folderNo !== folder.folderNo)
        );

        if (selectedFavoriteFolder?.folderNo === folder.folderNo) {
          setSelectedFavoriteFolder(null);
          setFavoriteModalOpen(false);
        }

        setDeleteTargetFolder(null);
      })
      .catch((err) => {
        console.error("Favorite folder delete error:", err);
        setMessage("폴더 삭제에 실패했습니다.");
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
      lat: post.lat,
      lng: post.lng,
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

        const nextLikedYn = data.likedYn;

        setSelectedPost((prev) => {
          if (!prev || prev.postId !== post.postId) return prev;

          return {
            ...prev,
            likedYn: nextLikedYn,
            likeCount: nextLikedYn
              ? (prev.likeCount || 0) + 1
              : Math.max((prev.likeCount || 0) - 1, 0)
          };
        });

        setPostList((prev) =>
          prev.map((item) => {
            if (item.postId !== post.postId) return item;

            return {
              ...item,
              likedYn: nextLikedYn,
              likeCount: nextLikedYn
                ? (item.likeCount || 0) + 1
                : Math.max((item.likeCount || 0) - 1, 0)
            };
          })
        );
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

    const openDmRoom = async () => {
      try {
        const res = await authFetch("http://localhost:3010/dm/room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            targetUserId: userId
          })
        });

        const data = await res.json();

        if (data.result !== "success") {
          alert(data.message || "메시지 방을 열 수 없습니다.");
          return;
        }

        navigate(`/so:lo/message?roomNo=${data.roomNo}`);
      } catch (err) {
        console.error("DM room open error:", err);
        alert("메시지 방을 열 수 없습니다.");
      }
    };

  const openBlockModal = () => {
    setBlockMessage("");
    setBlockModalOpen(true);
  };

  const closeBlockModal = () => {
    setBlockModalOpen(false);
    setBlockMessage("");
  };

  const blockUser = async () => {
    try {
      const res = await authFetch(`http://localhost:3010/profile/${userId}/block`, {
        method: "POST"
      });

      const data = await res.json();

      if (data.result !== "success") {
        setBlockMessage(data.message || "사용자 차단에 실패했습니다.");
        return;
      }

      closeBlockModal();
      navigate("/so:lo/feed", {
        state: {
          toastMessage: "사용자를 차단했습니다."
        }
      });
    } catch (err) {
      console.error("User block error:", err);
      setBlockMessage("사용자 차단에 실패했습니다.");
    }
  };

  useEffect(() => {
    setProfile(null);
    setMessage("");
    setActiveTab("posts");

    setPostList([]);
    setPostLoaded(false);
    setFavoriteFolderList([]);
    setFavoriteLoaded(false);
    setSelectedFavoriteFolder(null);
    setCanViewFavorites(true);

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
          openDmRoom={openDmRoom}
          blockUser={openBlockModal}
        />

        {blockModalOpen && (
          <div className="block-user-modal-backdrop">
            <div className="block-user-modal">
              <h3>사용자를 차단하시겠습니까?</h3>

              <p>
                차단하면 서로의 프로필, 글, 댓글, DM을 볼 수 없고
                팔로우 관계도 해제됩니다.
              </p>

              {blockMessage && (
                <p className="block-user-modal-message">
                  {blockMessage}
                </p>
              )}

              <div className="block-user-modal-actions">
                <button
                  type="button"
                  onClick={closeBlockModal}
                >
                  취소
                </button>

                <button
                  type="button"
                  className="danger"
                  onClick={blockUser}
                >
                  차단
                </button>
              </div>
            </div>
          </div>
        )}

        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);

            if (tab === "posts") {
              loadPostList();
            }

            if (tab === "favorites") {
              loadFavoriteFolderList();
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
              비공개 계정입니다. 팔로워만 작성한 기록을 볼 수 있어요.
            </div>
          )
        )}

        {activeTab === "favorites" && (
          canViewFavorites ? (
            favoriteFolderList.length === 0 ? (
              <div className="profile-empty">
                {isMyProfile ? (
                  <>
                    아직 찜한 업체가 없습니다.
                    <br />
                    기록에서 모핑 아이콘을 누르면 업체 찜이 가능합니다.
                  </>
                ) : (
                  "찜한 업체가 없습니다."
                )}
              </div>
            ) : (
              <div className="favorite-folder-list">
                {favoriteFolderList.map((folder) => (
                  <button
                    type="button"
                    key={folder.folderNo}
                    className="favorite-folder-item"
                    onClick={() => {
                      setSelectedFavoriteFolder(folder);
                      setFavoriteModalOpen(true);
                    }}
                  >
                    <span className="favorite-folder-name">
                      {folder.isShared === "N" && isMyProfile && (
                        <Lock size={15} strokeWidth={2.2} />
                      )}

                      {folder.folderName}
                    </span>

                    <span className="favorite-folder-right">
                      <small>{folder.placeCount}곳</small>

                      {isMyProfile && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="favorite-folder-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();

                            setDeleteTargetFolder(folder);
                            setDeleteFolderModalOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;

                            e.stopPropagation();

                            const ok = window.confirm(
                              `${folder.folderName} 폴더를 삭제하시겠습니까?`
                            );

                            if (!ok) return;

                            deleteFavoriteFolder(folder);
                          }}
                        >
                          삭제
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="profile-empty">
              비공개 계정입니다. 팔로워만 찜 업체를 볼 수 있어요.
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

        <ProfileFavoriteModal
          open={favoriteModalOpen}
          folder={selectedFavoriteFolder}
          deleteTargetFolder={deleteTargetFolder}
          onClose={() => {
            setFavoriteModalOpen(false);
            setSelectedFavoriteFolder(null);
          }}
          onCloseDeleteFolder={() => {
            setDeleteTargetFolder(null);
          }}
          onConfirmDeleteFolder={() => {
            deleteFavoriteFolder(deleteTargetFolder);
          }}
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
            showEditButton={isMyProfile}
            onPostDeleted={(deletedPostId) => {
              setPostList((prev) =>
                prev.filter((item) => item.postId !== deletedPostId)
              );
            }}
          />
        )}
      </main>
    </div>
  );
}

export default ProfilePage;