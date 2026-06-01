import {
  Heart,
  MessageCircleMore,
  MapPin
} from "lucide-react";

function FeedCard({
  feed,
  getTimeAgo,
  getShortAddress,
  openPostMenu,
  setOpenPostMenu,
  toggleLike,
  openDetailFromFeed,
  openDetailToComment,
  navigate
}) {
  return (
    <article
      className="feed-card"
      onClick={() => openDetailFromFeed(feed)}
    >
      <div className="feed-card-top">
        <div className="feed-user">
          <div
            className="feed-profile-img"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/so:lo/profile/${feed.userId}`);
            }}
          >
            {feed.userProfileImg ? (
              <img
                src={feed.userProfileImg}
                alt={feed.userNickname}
                className="feed-profile-real-img"
              />
            ) : (
              feed.userNickname.slice(0, 1)
            )}
          </div>
          <strong
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/so:lo/profile/${feed.userId}`);
            }}
          >
            {feed.userNickname}
          </strong>

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
              <button className="danger-menu-btn">차단하기</button>
              <button className="danger-menu-btn">신고하기</button>
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
                openDetailToComment(feed);
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
          </div>
        )}
      </div>
    </article>
  );
}

export default FeedCard;