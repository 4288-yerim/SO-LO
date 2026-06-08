import {
  Heart,
  MessageCircleMore,
  MapPin,
  Globe,
  CalendarDays,
  ShoppingBag,
  Phone,
  ExternalLink,
  Store,
  Utensils,
  Coffee,
  Gift,
  Percent,
  Megaphone,
  Ticket,
  Clock,
  Star,
  Home,
  Car,
  MessageCircle,
  Link
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

  const adLinkIconMap = {
    Globe,
    CalendarDays,
    MapPin,
    ShoppingBag,
    Phone,
    ExternalLink,
    Store,
    Utensils,
    Coffee,
    Gift,
    Percent,
    Megaphone,
    Ticket,
    Clock,
    Star,
    Home,
    Car,
    MessageCircle,
    Link
  };

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
          {feed.isAd && (
            <div className="feed-ad-badge-row">
              <span className="feed-ad-badge">광고</span>

              {feed.adTag && (
                <span className="feed-ad-tag">{feed.adTag}</span>
              )}
            </div>
          )}

          <h3>{feed.title}</h3>
          <p>{feed.content}</p>

          <div className="feed-tags">
            {feed.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>

          {feed.isAd && feed.adLinks && feed.adLinks.length > 0 && (
            <div className="feed-ad-links">
              {feed.adLinks.map((link, index) => {
                const LinkIcon = link.linkIcon
                  ? adLinkIconMap[link.linkIcon]
                  : null;

                return (
                  <a
                    key={index}
                    href={link.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {LinkIcon && <LinkIcon size={15} />}
                    <span>{link.linkName}</span>
                  </a>
                );
              })}
            </div>
          )}
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