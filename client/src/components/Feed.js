import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "./routes/authFetch";
import {
  PenLine,
  Heart,
  MessageCircleMore,
  MapPin,
  Utensils,
  Wine,
  Briefcase,
  Coffee
} from "lucide-react";
import "../css/Feed.css";
import person from "../assets/today-person.png";
import Sidebar from "./Sidebar";

function Feed() {
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

  function getTodayStat(categoryNo) {
    return todayStats.find((stat) => stat.category === categoryNo) || {
      count: 0,
      diff: 0
    };
  }

  const location = useLocation();
  const navigate = useNavigate();
  const [feedList, setFeedList] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [todayStats, setTodayStats] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [detailFileIndex, setDetailFileIndex] = useState(0);
  const [commentList, setCommentList] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [openReplyMap, setOpenReplyMap] = useState({});
  const commentAreaRef = useRef(null);
  const [openPostMenu, setOpenPostMenu] = useState(null);
  const [openDetailMenu, setOpenDetailMenu] = useState(false);
  const [openCommentMenu, setOpenCommentMenu] = useState(null);

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

  function submitComment() {
    if (!commentInput.trim()) {
      return;
    }

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

  function toggleLike(postId) {
    authFetch("http://localhost:3010/feed/like", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postNo: postId
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {

          setFeedList((prev) =>
            prev.map((post) => {
              if (post.postId !== postId) {
                return post;
              }

              return {
                ...post,
                likedYn: data.likedYn,
                likeCount: data.likedYn
                  ? post.likeCount + 1
                  : post.likeCount - 1
              };
            })
          );

          if (selectedPost && selectedPost.postId === postId) {
            setSelectedPost((prev) => ({
              ...prev,
              likedYn: data.likedYn,
              likeCount: data.likedYn
                ? prev.likeCount + 1
                : prev.likeCount - 1
            }));
          }
        }
      })
      .catch((err) => {
        console.error("좋아요 실패:", err);
      });
  }

  useEffect(() => {
    authFetch("http://localhost:3010/feed")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setFeedList(data.feedList);
          setTodayStats(data.todayStats);
        }
      })
      .catch((err) => {
        console.error("피드 불러오기 실패:", err);
      });
  }, []);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToastMessage(location.state.toastMessage);

      const timer = setTimeout(() => {
        setToastMessage("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  return (
    <div className="feed-page">
      <Sidebar />

      {toastMessage && (
        <div className="feed-toast">
          {toastMessage}
        </div>
      )}

      <main className="feed-main">
        <section className="today-card">
          <div className="today-title-box">
            <h2>SO:LO의 오늘</h2>
            <p>오늘, 우리들의 혼자 시간</p>
          </div>

          <div className="today-stats">
            <div className="today-stat">
              <Utensils size={24} />
              <b>혼밥</b>
              <strong>{getTodayStat(1).count}<span>명</span></strong>
              <p>어제보다 {getTodayStat(1).diff >= 0 ? "+" : ""}{getTodayStat(1).diff}</p>
            </div>

            <div className="today-stat">
              <Wine size={24} />
              <b>혼술</b>
              <strong>{getTodayStat(2).count}<span>명</span></strong>
              <p>어제보다 {getTodayStat(2).diff >= 0 ? "+" : ""}{getTodayStat(2).diff}</p>
            </div>

            <div className="today-stat">
              <Briefcase size={24} />
              <b>혼행</b>
              <strong>{getTodayStat(5).count}<span>명</span></strong>
              <p>어제보다 {getTodayStat(5).diff >= 0 ? "+" : ""}{getTodayStat(5).diff}</p>
            </div>

            <div className="today-stat">
              <Coffee size={24} />
              <b>혼카페</b>
              <strong>{getTodayStat(3).count}<span>명</span></strong>
              <p>어제보다 {getTodayStat(3).diff >= 0 ? "+" : ""}{getTodayStat(3).diff}</p>
            </div>

            <div className="today-stat">
              <PenLine size={24} />
              <b>혼놀</b>
              <strong>{getTodayStat(4).count}<span>명</span></strong>
              <p>어제보다 {getTodayStat(4).diff >= 0 ? "+" : ""}{getTodayStat(4).diff}</p>
            </div>
          </div>

          <div className="today-illust">
            <div className="sun" />
            <div className="cloud cloud-one" />
            <div className="cloud cloud-two" />
            <div className="hill hill-one" />
            <div className="hill hill-two" />
            <img
              className="today-person-img"
              src={person}
              alt="앉아있는 사람"
            />
          </div>
        </section>

        <section className="feed-filter-row">
          <div>
            <button className="active">전체</button>
            <button>팔로잉</button>
          </div>
        </section>

        <section className="feed-list">
          {feedList.map((feed) => (
            <article
              className="feed-card"
              key={feed.postId}
              onClick={() => {
                setSelectedPost(feed);
                setDetailFileIndex(0);
                setCommentInput("");
                setReplyTarget(null);
                setOpenReplyMap({});
                loadComments(feed.postId);
              }}
            >
              <div className="feed-card-top">
                <div className="feed-user">
                  <div className="feed-profile-img">
                    {feed.userNickname.slice(0, 1)}
                  </div>
                  <strong>{feed.userNickname}</strong>
                  <span>· {getTimeAgo(feed.timeAgo)}</span>
                </div>

                <div className="feed-more-wrap">
                  <button
                    className="feed-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenPostMenu(openPostMenu === feed.postId ? null : feed.postId);
                    }}
                  >
                    ...
                  </button>

                  {openPostMenu === feed.postId && (
                    <div className="feed-more-menu" onClick={(e) => e.stopPropagation()}>
                      <button>차단하기</button>
                      <button>신고하기</button>
                      <button>공유하기</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="feed-card-body">
                {feed.imageUrl && (
                  feed.fileType === "VDO" ? (
                    <video src={feed.imageUrl} controls />
                  ) : (
                    <img src={feed.imageUrl} alt={feed.title} />
                  )
                )}

                <div className="feed-content">
                  <h3>{feed.title}</h3>
                  <p>{feed.content}</p>

                  <div className="feed-tags">
                    {feed.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="feed-card-bottom">
                <div className="feed-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(feed.postId);
                    }}
                  >
                    <Heart
                      size={24}
                      fill={feed.likedYn ? "#d46a6a" : "none"}
                    />
                    <span>{feed.likeCount}</span>
                  </button>

                  {feed.cmtYn === "Y" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();

                        setSelectedPost(feed);
                        setDetailFileIndex(0);
                        setCommentInput("");
                        setReplyTarget(null);
                        setOpenReplyMap({});
                        loadComments(feed.postId);

                        setTimeout(() => {
                          commentAreaRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                          });
                        }, 100);
                      }}
                    >
                      <MessageCircleMore size={24} />
                      <span>{feed.commentCount}</span>
                    </button>
                  )}
                </div>

                {feed.location && (
                  <div className="feed-location">
                    <MapPin size={18} />
                    <span>
                      {getShortAddress(feed.locationAddress)
                        ? `${getShortAddress(feed.locationAddress)}, ${feed.location}`
                        : feed.location}
                    </span>
                    <MapPin size={18} />
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>

      {selectedPost && (
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
                <div className="feed-profile-img">
                  {selectedPost.userNickname.slice(0, 1)}
                </div>

                <div>
                  <strong>{selectedPost.userNickname}</strong>
                  <p>{getTimeAgo(selectedPost.timeAgo)}</p>
                </div>
              </div>

              <div className="post-detail-scroll">
                <div className="post-detail-content">
                  <div className="post-title-row">
                    <h2>{selectedPost.title}</h2>

                    <div className="detail-more-wrap">
                      <button
                        className="feed-more-btn"
                        onClick={() => setOpenDetailMenu(!openDetailMenu)}
                      >
                        ...
                      </button>

                      {openDetailMenu && (
                        <div className="feed-more-menu detail-menu">
                          <button className="danger-menu-btn">차단하기</button>
                          <button className="danger-menu-btn">신고하기</button>
                          <button>공유하기</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p>{selectedPost.content}</p>
                </div>

                {selectedPost.cmtYn === "Y" && (
                  <div className="post-detail-comment-area" ref={commentAreaRef}>
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
                                      <button>신고하기</button>
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
                                </div>
                              ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="post-detail-bottom-info">
                <div className="post-detail-tags">
                  {selectedPost.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>

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
              </div>

              {selectedPost.cmtYn === "Y" && (
                <div className="comment-input-box">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                  <button onClick={submitComment}>게시</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;