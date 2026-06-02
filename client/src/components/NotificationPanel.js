import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./routes/authFetch";
import "../css/NotificationPanel.css";

function NotificationPanel({ open, onClose, onUnreadCountChange }) {
  const navigate = useNavigate();

  const [activeType, setActiveType] = useState("ALL");
  const [notificationList, setNotificationList] = useState([]);
  const [message, setMessage] = useState("");

  const menuList = [
    { label: "전체", value: "ALL" },
    { label: "팔로우", value: "FLW" },
    { label: "댓글", value: "CMT" },
    { label: "좋아요", value: "LKE" },
    { label: "메시지", value: "DM" }
  ];

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

  function loadNotificationList(type) {
    authFetch(`http://localhost:3010/notification?type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "알림을 불러오지 못했습니다.");
          return;
        }

        setNotificationList(data.notificationList || []);
        setMessage("");
      })
      .catch((err) => {
        console.error("Notification list error:", err);
        setMessage("알림을 불러오지 못했습니다.");
      });
  }

  function readNotification(notiNo) {
    authFetch(`http://localhost:3010/notification/${notiNo}/read`, {
      method: "PUT"
    })
      .then(() => {
        if (onUnreadCountChange) {
          onUnreadCountChange();
        }
      })
      .catch((err) => {
        console.error("Notification read error:", err);
      });
  }

  function readAllNotification() {
    authFetch("http://localhost:3010/notification/read-all", {
      method: "PUT"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "모두 읽음 처리에 실패했습니다.");
          return;
        }

        loadNotificationList(activeType);

        if (onUnreadCountChange) {
          onUnreadCountChange();
        }
      })
      .catch((err) => {
        console.error("Notification read all error:", err);
        setMessage("모두 읽음 처리에 실패했습니다.");
      });
  }

  function moveByNotification(noti) {
    readNotification(noti.notiNo);

    if (noti.notiType === "DM") {
      navigate(`/so:lo/message?roomNo=${noti.targetId}`);
      onClose();
      return;
    }

    if (noti.notiType === "CMT" || noti.notiType === "LKE") {
      navigate("/so:lo/feed", {
        state: {
          notificationPostNo: noti.targetId,
          notificationType: noti.notiType
        }
      });
      onClose();
      return;
    }

    if (noti.notiType === "FLW") {
      navigate(`/so:lo/profile/${noti.senderId}`);
      onClose();
    }
  }

  function approveFollowRequest(e, requestNo) {
    e.stopPropagation();

    authFetch(`http://localhost:3010/notification/follow-requests/${requestNo}/approve`, {
      method: "POST"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "팔로우 요청 승인에 실패했습니다.");
          return;
        }

        loadNotificationList(activeType);
      })
      .catch((err) => {
        console.error("Follow request approve error:", err);
        setMessage("팔로우 요청 승인에 실패했습니다.");
      });
  }

  function rejectFollowRequest(e, requestNo) {
    e.stopPropagation();

    authFetch(`http://localhost:3010/notification/follow-requests/${requestNo}/reject`, {
      method: "POST"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "팔로우 요청 거절에 실패했습니다.");
          return;
        }

        loadNotificationList(activeType);
      })
      .catch((err) => {
        console.error("Follow request reject error:", err);
        setMessage("팔로우 요청 거절에 실패했습니다.");
      });
  }

  useEffect(() => {
    if (!open) return;

    loadNotificationList(activeType);
  }, [open, activeType]);

  if (!open) {
    return null;
  }

  return (
    <section className="notification-panel">
      <div className="notification-panel-header">
        <h3>알림</h3>

        <div className="notification-header-actions">
          <button
            type="button"
            className="notification-read-all-btn"
            onClick={readAllNotification}
          >
            모두 읽음
          </button>

          <button
            type="button"
            className="notification-panel-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      <div className="notification-tab-list">
        {menuList.map((menu) => (
          <button
            type="button"
            key={menu.value}
            className={`notification-tab ${
              activeType === menu.value ? "active" : ""
            }`}
            onClick={() => setActiveType(menu.value)}
          >
            {menu.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="notification-message">{message}</p>
      )}

      <div className="notification-list">
        {notificationList.length === 0 ? (
          <div className="notification-empty">
            알림이 없습니다.
          </div>
        ) : (
          notificationList.map((noti) => (
            <div
              key={noti.notiNo}
              role="button"
              tabIndex={0}
              className={`notification-item ${
                noti.readYn === "N" ? "unread" : ""
              }`}
              onClick={() => moveByNotification(noti)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  moveByNotification(noti);
                }
              }}
            >
              <div className="notification-profile-img">
                {noti.senderProfileImg ? (
                  <img src={noti.senderProfileImg} alt="프로필" />
                ) : (
                  <span>
                    {noti.senderNickname
                      ? noti.senderNickname.slice(0, 1)
                      : "?"}
                  </span>
                )}
              </div>

              <div className="notification-content-box">
                <p className="notification-content">
                  <strong>{noti.senderNickname}</strong>
                  {noti.content}
                </p>

                <span className="notification-time">
                  {getTimeAgo(noti.cdate)}
                </span>

                {noti.notiType === "FLW" && noti.requestNo && (
                  <div className="notification-action-row">
                    <button
                      type="button"
                      onClick={(e) => rejectFollowRequest(e, noti.requestNo)}
                    >
                      거절
                    </button>

                    <button
                      type="button"
                      onClick={(e) => approveFollowRequest(e, noti.requestNo)}
                    >
                      승인
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default NotificationPanel;