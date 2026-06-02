import { Heart, MapPin, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authFetch } from "../routes/authFetch";

function PostDetailModal({
  selectedPost,
  setSelectedPost,
  detailFileIndex,
  setDetailFileIndex,
  commentList,
  commentInput,
  setCommentInput,
  replyTarget,
  setReplyTarget,
  openReplyMap,
  setOpenReplyMap,
  openCommentMenu,
  setOpenCommentMenu,
  commentAreaRef,
  submitComment,
  toggleLike,
  getTimeAgo,
  getShortAddress,
  navigate
}) {
  const [openPostMenu, setOpenPostMenu] = useState(false);
  const postMenuRef = useRef(null);
  const [favoriteFolderList, setFavoriteFolderList] = useState([]);
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [selectedFolderNo, setSelectedFolderNo] = useState("");
  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [placeFavoritedYn, setPlaceFavoritedYn] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderInfo, setNewFolderInfo] = useState("");
  const [newFolderShared, setNewFolderShared] = useState("N");
  const [folderCreateMessage, setFolderCreateMessage] = useState("");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        postMenuRef.current &&
        !postMenuRef.current.contains(e.target)
      ) {
        setOpenPostMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadFavoriteFolders = () => {
    authFetch("http://localhost:3010/favorite/folders")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setFavoriteFolderList(data.folderList);
        }
      })
      .catch((err) => {
        console.error("찜 폴더 불러오기 실패:", err);
      });
  };

  const checkFavoritePlace = () => {
    if (!selectedPost.location || !selectedPost.locationAddress) return;

    const query = new URLSearchParams({
      placeName: selectedPost.location,
      placeAddress: selectedPost.locationAddress
    });

    authFetch(`http://localhost:3010/favorite/place/check?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPlaceFavoritedYn(data.favoritedYn);
        }
      })
      .catch((err) => {
        console.error("업체 찜 여부 확인 실패:", err);
      });
  };

  const openFavoriteModal = (e) => {
    e.stopPropagation();

    if (!selectedPost.location || !selectedPost.locationAddress) return;

    setFavoriteMessage("");
    setSelectedFolderNo("");
    setFavoriteModalOpen(true);
    loadFavoriteFolders();
  };

  const saveFavoritePlace = () => {
    if (!selectedFolderNo) {
      setFavoriteMessage("저장할 폴더를 선택해주세요.");
      return;
    }

    authFetch("http://localhost:3010/favorite/place", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        folderNo: selectedFolderNo,
        placeName: selectedPost.location,
        placeAddress: selectedPost.locationAddress,
        lat: selectedPost.lat,
        lng: selectedPost.lng,
        memo: ""
      })
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          setFavoriteMessage(data.message || "업체 저장에 실패했습니다.");
          return;
        }

        if (data.result === "success") {
          setPlaceFavoritedYn(true);
          setFavoriteModalOpen(false);
          setFavoriteMessage("");
        }
      })
      .catch((err) => {
        console.error("업체 찜 저장 실패:", err);
        setFavoriteMessage("업체 저장에 실패했습니다.");
      });
  };

  const createFavoriteFolder = () => {
    if (!newFolderName.trim()) {
      setFolderCreateMessage("폴더명을 입력해주세요.");
      return;
    }

    authFetch("http://localhost:3010/favorite/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        folderName: newFolderName.trim(),
        folderInfo: newFolderInfo.trim(),
        isShared: newFolderShared
      })
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          setFolderCreateMessage(data.message || "폴더 생성에 실패했습니다.");
          return;
        }

        if (data.result === "success") {
          setFavoriteFolderList((prev) => [data.folder, ...prev]);
          setSelectedFolderNo(data.folder.folderNo);

          setNewFolderName("");
          setNewFolderInfo("");
          setNewFolderShared("N");
          setFolderCreateMessage("");
        }
      })
      .catch((err) => {
        console.error("찜 폴더 생성 실패:", err);
        setFolderCreateMessage("폴더 생성에 실패했습니다.");
      });
  };

  useEffect(() => {
    setPlaceFavoritedYn(false);

    if (selectedPost.location && selectedPost.locationAddress) {
      checkFavoritePlace();
    }
  }, [selectedPost.postId]);

  return (
    <div className="post-detail-backdrop" onClick={() => setSelectedPost(null)}>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="post-detail-close"
          onClick={() => setSelectedPost(null)}
        >
          ×
        </button>

        <div className="post-detail-media">
          {selectedPost.files && selectedPost.files.length > 0 ? (
            <>
              {selectedPost.files[detailFileIndex].fileType === "VDO" ? (
                <video
                  src={selectedPost.files[detailFileIndex].fileUrl}
                  controls
                />
              ) : (
                <img
                  src={selectedPost.files[detailFileIndex].fileUrl}
                  alt={selectedPost.title}
                />
              )}

              {selectedPost.files.length > 1 && (
                <>
                  <button
                    className="post-file-arrow left"
                    onClick={() =>
                      setDetailFileIndex((prev) =>
                        prev === 0 ? selectedPost.files.length - 1 : prev - 1
                      )
                    }
                  >
                    ‹
                  </button>

                  <button
                    className="post-file-arrow right"
                    onClick={() =>
                      setDetailFileIndex((prev) =>
                        prev === selectedPost.files.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    ›
                  </button>

                  <div className="post-file-count">
                    {detailFileIndex + 1} / {selectedPost.files.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="post-detail-no-media">
              이미지 없음
            </div>
          )}
        </div>

        <div className="post-detail-info">
          <div className="post-detail-user">
            <div
              className="feed-profile-img"
              onClick={() => {
                setSelectedPost(null);
                navigate(`/so:lo/profile/${selectedPost.userId}`);
              }}
            >
              {selectedPost.userProfileImg ? (
                <img
                  src={selectedPost.userProfileImg}
                  alt={selectedPost.userNickname}
                  className="feed-profile-real-img"
                />
              ) : (
                selectedPost.userNickname.slice(0, 1)
              )}
            </div>

            <div>
              <strong
                onClick={() => {
                  setSelectedPost(null);
                  navigate(`/so:lo/profile/${selectedPost.userId}`);
                }}
              >
                {selectedPost.userNickname}
              </strong>
              <p>{getTimeAgo(selectedPost.timeAgo)}</p>
            </div>
          </div>

          <div className="post-detail-scroll">
            <div className="post-detail-content">
              <h2>{selectedPost.title}</h2>
              <p>{selectedPost.content}</p>
            </div>

            <div className="post-detail-bottom-info">
              {selectedPost.location && (
                <div className="post-detail-location">
                  <button
                    type="button"
                    className={`post-place-favorite-btn ${placeFavoritedYn ? "active" : ""}`}
                    onClick={openFavoriteModal}
                    title="업체 찜"
                  >
                    <MapPin
                      size={17}
                      fill="none"
                      strokeWidth={placeFavoritedYn ? 3 : 2}
                    />
                  </button>

                  <span>
                    {getShortAddress(selectedPost.locationAddress)
                      ? `${getShortAddress(selectedPost.locationAddress)}, ${selectedPost.location}`
                      : selectedPost.location}
                  </span>
                </div>
              )}

              <div className="post-detail-tags">
                {selectedPost.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            </div>

            {selectedPost.cmtYn === "Y" && (
              <div className="comment-input-box">
                <div className="comment-list">
                  {commentList.length === 0 ? (
                    <p className="empty-comment">아직 댓글이 없습니다.</p>
                  ) : (
                    commentList.map((comment) => (
                      <div className="comment-block" key={comment.commentNo}>
                        <div
                          className="comment-row"
                          onMouseLeave={() => setOpenCommentMenu(null)}
                        >
                          <div
                            className="comment-item"
                            onClick={() => {
                              setReplyTarget(comment);
                              setCommentInput(`@${comment.userNickname} `);
                            }}
                          >
                            <div className="comment-profile-img">
                              {comment.userNickname.slice(0, 1)}
                            </div>

                            <div className="comment-text-box">
                              <strong>{comment.userNickname}</strong>
                              <span> {comment.content}</span>
                            </div>

                            <div className="comment-more-wrap">
                              <button
                                className="comment-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();

                                  setOpenCommentMenu(
                                    openCommentMenu === comment.commentNo
                                      ? null
                                      : comment.commentNo
                                  );
                                }}
                              >
                                ...
                              </button>

                              {openCommentMenu === comment.commentNo && (
                                <div className="comment-more-menu">
                                  <button className="danger-menu-btn">신고하기</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {comment.replies && comment.replies.length > 0 && (
                          <button
                            className="reply-more-btn"
                            onClick={() =>
                              setOpenReplyMap((prev) => ({
                                ...prev,
                                [comment.commentNo]: !prev[comment.commentNo]
                              }))
                            }
                          >
                            {openReplyMap[comment.commentNo]
                              ? "답글 숨기기"
                              : `답글 ${comment.replies.length}개 더보기`}
                          </button>
                        )}

                        {openReplyMap[comment.commentNo] &&
                          comment.replies.map((reply) => (
                            <div
                              className="reply-row"
                              key={reply.commentNo}
                              onMouseLeave={() => setOpenCommentMenu(null)}
                            >
                              <div
                                className="reply-item"
                                onClick={() => {
                                  setReplyTarget({
                                    commentNo: comment.commentNo,
                                    userId: reply.userId,
                                    userNickname: reply.userNickname
                                  });
                                  setCommentInput(`@${reply.userNickname} `);
                                }}
                              >
                                <div className="comment-profile-img small">
                                  {reply.userNickname.slice(0, 1)}
                                </div>

                                <div className="comment-text-box">
                                  <strong>{reply.userNickname}</strong>

                                  {reply.mentionUserId && (
                                    <span
                                      className="mention-link"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/so:lo/profile/${reply.mentionUserId}`);
                                      }}
                                    >
                                      @{reply.mentionUserNickname}
                                    </span>
                                  )}

                                  <span>{reply.content.replace(/^@\S+\s*/, " ")}</span>
                                </div>
                              </div>

                              <div className="comment-more-wrap">
                                <button
                                  className="comment-more-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setOpenCommentMenu(
                                      openCommentMenu === `reply-${reply.commentNo}`
                                        ? null
                                        : `reply-${reply.commentNo}`
                                    );
                                  }}
                                >
                                  ...
                                </button>

                                {openCommentMenu === `reply-${reply.commentNo}` && (
                                  <div className="comment-more-menu">
                                    <button className="danger-menu-btn">신고하기</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="post-detail-action-row">
            <div className="post-detail-action-left">
              <button
                className={`post-detail-like-btn ${selectedPost.likedYn ? "active" : ""}`}
                onClick={() => toggleLike(selectedPost)}
              >
                <Heart
                  size={22}
                  fill={selectedPost.likedYn ? "currentColor" : "none"}
                />
                <span>{selectedPost.likeCount || 0}</span>
              </button>

              {selectedPost.cmtYn === "Y" && (
                <div className="post-detail-comment-count">
                  <MessageCircle size={22} />
                  <span>{selectedPost.commentCount || 0}</span>
                </div>
              )}

              <button
                type="button"
                className="post-detail-share-btn"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Share2 size={21} />
              </button>
            </div>

            <div className="post-detail-more-wrap" ref={postMenuRef}>
              <button
                type="button"
                className="post-detail-more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPostMenu((prev) => !prev);
                }}
              >
                <MoreHorizontal size={24} />
              </button>

              {openPostMenu && (
                <div className="post-detail-more-menu">
                  <button type="button">차단하기</button>
                  <button type="button" className="danger-menu-btn">
                    신고하기
                  </button>
                </div>
              )}
            </div>
          </div>

          {selectedPost.cmtYn === "Y" && (
            <div className="comment-input-box">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    submitComment();
                  }
                }}
                placeholder={
                  replyTarget
                    ? `${replyTarget.userNickname}님에게 답글 남기기...`
                    : "댓글 달기..."
                }
                maxLength={300}
              />
              <button onClick={submitComment}>게시</button>
            </div>
          )}
        </div>

        {favoriteModalOpen && (
          <div
            className="favorite-place-modal-backdrop"
            onClick={() => setFavoriteModalOpen(false)}
          >
            <div
              className="favorite-place-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>업체 저장</h3>

              <p className="favorite-place-name">
                {selectedPost.location}
              </p>

              <p className="favorite-place-address">
                {selectedPost.locationAddress}
              </p>

              <div className="post-favorite-two-column">
                <div className="post-favorite-create-area">
                  <h4>새 폴더 생성</h4>

                  <div className="post-favorite-create-box">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => {
                        setNewFolderName(e.target.value);
                        setFolderCreateMessage("");
                      }}
                      placeholder="폴더명"
                      maxLength={30}
                    />

                    <input
                      type="text"
                      value={newFolderInfo}
                      onChange={(e) => setNewFolderInfo(e.target.value)}
                      placeholder="폴더 설명"
                      maxLength={100}
                    />

                    <div className="post-favorite-share-row">
                      <button
                        type="button"
                        className={newFolderShared === "N" ? "active" : ""}
                        onClick={() => setNewFolderShared("N")}
                      >
                        비공개
                      </button>

                      <button
                        type="button"
                        className={newFolderShared === "Y" ? "active" : ""}
                        onClick={() => setNewFolderShared("Y")}
                      >
                        공개
                      </button>
                    </div>

                    {folderCreateMessage && (
                      <p className="post-favorite-message">{folderCreateMessage}</p>
                    )}

                    <button
                      type="button"
                      className="post-favorite-folder-submit-btn"
                      onClick={createFavoriteFolder}
                    >
                      폴더 생성
                    </button>
                  </div>
                </div>

                <div className="post-favorite-list-area">
                  <h4>폴더 목록</h4>

                  <div className="post-favorite-folder-list">
                    {favoriteFolderList.length === 0 ? (
                      <p className="post-favorite-empty-folder">
                        아직 폴더가 없습니다.
                      </p>
                    ) : (
                      favoriteFolderList.map((folder) => (
                        <button
                          type="button"
                          key={folder.folderNo}
                          className={
                            String(selectedFolderNo) === String(folder.folderNo)
                              ? "post-favorite-folder-item active"
                              : "post-favorite-folder-item"
                          }
                          onClick={() => {
                            setSelectedFolderNo(folder.folderNo);
                            setFavoriteMessage("");
                          }}
                        >
                          <span>{folder.folderName}</span>
                          <small>{folder.placeCount}개</small>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <p className="post-favorite-message">
                {favoriteMessage || "\u00A0"}
              </p>

              <div className="favorite-modal-actions">
                <button
                  type="button"
                  onClick={() => setFavoriteModalOpen(false)}
                >
                  취소
                </button>

                <button
                  type="button"
                  onClick={saveFavoritePlace}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetailModal;