import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "./routes/authFetch";
import "../css/Feed.css";
import "../css/feed/TodayCard.css";
import "../css/feed/FeedCard.css";
import "../css/feed/PostDetailModal.css";
import Sidebar from "./Sidebar";
import TodayCard from "./feed/TodayCard";
import FeedCard from "./feed/FeedCard";
import PostDetailModal from "./feed/PostDetailModal";

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
  const [deletePostModalOpen, setDeletePostModalOpen] = useState(false);
  const [deleteTargetPost, setDeleteTargetPost] = useState(null);
  const [deletePostMessage, setDeletePostMessage] = useState("");

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
          const postId = selectedPost.postId;

          setCommentInput("");
          setReplyTarget(null);

          setFeedList((prev) =>
            prev.map((post) =>
              post.postId === postId
                ? {
                    ...post,
                    commentCount: (post.commentCount || 0) + 1
                  }
                : post
            )
          );

          setSelectedPost((prev) =>
            prev && prev.postId === postId
              ? {
                  ...prev,
                  commentCount: (prev.commentCount || 0) + 1
                }
              : prev
          );

          loadComments(postId);
        }
      })
      .catch((err) => {
        console.error("댓글 등록 실패:", err);
      });
  }

  function handleCommentDeleted() {
    if (!selectedPost) return;

    loadComments(selectedPost.postId);

    setFeedList((prev) =>
      prev.map((post) =>
        post.postId === selectedPost.postId
          ? {
              ...post,
              commentCount: Math.max(
                0,
                (post.commentCount || 0) - 1
              )
            }
          : post
      )
    );

    setSelectedPost((prev) =>
      prev
        ? {
            ...prev,
            commentCount: Math.max(
              0,
              (prev.commentCount || 0) - 1
            )
          }
        : prev
    );
  }

  function openDetailFromFeed(feed) {

    authFetch("http://localhost:3010/feed/view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        postNo: feed.postId
      })
    }).catch((err) => {
      console.error("조회 로그 저장 실패:", err);
    });

    setSelectedPost({
      ...feed,
      location: feed.location || feed.placeName || "",
      locationAddress: feed.locationAddress || feed.placeAddress || "",
      lat: feed.lat,
      lng: feed.lng
    });

    setDetailFileIndex(0);
    setCommentInput("");
    setReplyTarget(null);
    setOpenReplyMap({});
    setOpenDetailMenu(false);
    setOpenCommentMenu(null);
    loadComments(feed.postId);
  }

  function openDeletePostModal(post) {
    setDeleteTargetPost(post);
    setDeletePostMessage("");
    setDeletePostModalOpen(true);
  }

  function closeDeletePostModal() {
    setDeletePostModalOpen(false);
    setDeleteTargetPost(null);
    setDeletePostMessage("");
  }

  function confirmDeletePost() {
    if (!deleteTargetPost) return;

    authFetch(
      `http://localhost:3010/profile/posts/${deleteTargetPost.postId}`,
      {
        method: "DELETE"
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setDeletePostMessage(
            data.message || "게시글 삭제에 실패했습니다."
          );
          return;
        }

        setFeedList((prev) =>
          prev.filter(
            (item) => item.postId !== deleteTargetPost.postId
          )
        );

        setSelectedPost(null);
        closeDeletePostModal();
      })
      .catch((err) => {
        console.error("게시글 삭제 실패:", err);
        setDeletePostMessage("게시글 삭제에 실패했습니다.");
      });
  }

  function openDetailToComment(feed) {
    openDetailFromFeed(feed);

    setTimeout(() => {
      commentAreaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 100);
  }

  function toggleLike(postOrId) {
    const postId =
      typeof postOrId === "object"
        ? postOrId.postId
        : postOrId;

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

  function loadFeed() {
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
  }

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    if (!location.state?.refreshFeed) return;

    loadFeed();

    navigate(location.pathname, {
      replace: true,
      state: {
        toastMessage: location.state.toastMessage || ""
      }
    });
  }, [location.state]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToastMessage(location.state.toastMessage);

      const timer = setTimeout(() => {
        setToastMessage("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    if (!location.state?.notificationPostNo) return;
    if (feedList.length === 0) return;

    const targetPost = feedList.find(
      (feed) => String(feed.postId) === String(location.state.notificationPostNo)
    );

    if (!targetPost) return;

    if (location.state.notificationType === "CMT") {
      openDetailToComment(targetPost);
    } else {
      openDetailFromFeed(targetPost);
    }

    navigate("/so:lo/feed", { replace: true });
  }, [location.state, feedList]);

  return (
    <div className="feed-page">
      <Sidebar />

      {toastMessage && (
        <div className="feed-toast">
          {toastMessage}
        </div>
      )}

      <main className="feed-main">

        <TodayCard todayStats={todayStats} />

        <section className="feed-filter-row"></section>

        <section className="feed-list">
          {feedList.map((feed) => (
            <FeedCard
              key={feed.postId}
              feed={feed}
              getTimeAgo={getTimeAgo}
              getShortAddress={getShortAddress}
              openPostMenu={openPostMenu}
              setOpenPostMenu={setOpenPostMenu}
              toggleLike={toggleLike}
              openDetailFromFeed={openDetailFromFeed}
              openDetailToComment={openDetailToComment}
              navigate={navigate}
              deletePost={openDeletePostModal}
            />
          ))}
        </section>
      </main>

      {selectedPost && (
        <PostDetailModal
          selectedPost={selectedPost}
          setSelectedPost={setSelectedPost}
          detailFileIndex={detailFileIndex}
          toggleLike={toggleLike}
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
          onPostDeleted={(deletedPostId) => {
            setFeedList((prev) =>
              prev.filter((item) => item.postId !== deletedPostId)
            );
          }}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </div>
  );
}

export default Feed;