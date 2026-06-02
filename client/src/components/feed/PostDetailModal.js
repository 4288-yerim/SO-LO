import { Heart, MapPin } from "lucide-react";

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
                  <MapPin size={17} />
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

          {selectedPost.cmtYn === "Y" && (
            <>
              <div className="post-detail-like-box">
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
              </div>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostDetailModal;