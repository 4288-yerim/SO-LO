// 게시글 사진 목록

import React from "react";

function ProfilePostGrid({ postList, emptyText, onPostClick }) {
  if (!postList || postList.length === 0) {
    return <div className="profile-empty">{emptyText}</div>;
  }

  return (
    <section className="profile-post-section">
      <div className="profile-post-grid">
        {postList.map((post) => (
          <button
            type="button"
            className="profile-post-card"
            key={post.postId}
            onClick={() => onPostClick(post)}
          >
            {post.fileType === "VDO" ? (
              <video
                src={post.imageUrl}
                className="profile-post-media"
                muted
              />
            ) : (
              <img
                src={post.imageUrl}
                alt={post.title}
                className="profile-post-media"
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ProfilePostGrid;