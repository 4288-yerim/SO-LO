import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  User,
  PenLine,
  Bell,
  MessageCircle,
  Settings,
  Search,
  LogOut
} from "lucide-react";
import "../css/Sidebar.css";
import "../css/SearchPanel.css";
import soloLogo from "../assets/soloLogo.png";
import soloLogoMini from "../assets/soloLogo_n.png";
import NotificationPanel from "./NotificationPanel";
import SearchPanel from "./SearchPanel";
import { authFetch } from "./routes/authFetch";

function Sidebar() {
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  function loadUnreadCount() {
    authFetch("http://localhost:3010/notification/unread-count")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch((err) => {
        console.error("Notification unread count error:", err);
      });
  }

  useEffect(() => {
    if (!token) return;

    loadUnreadCount();
  }, [token]);

  const menuList = [
    { name: "홈", path: "/so:lo/feed", icon: <Home size={22} /> },
    { name: "검색", path: "/so:lo/search", icon: <Search size={22} /> },
    { name: "프로필", path: "/so:lo/profile", icon: <User size={22} /> },
    { name: "기록하기", path: "/so:lo/post", icon: <PenLine size={22} /> },
    { name: "알림", action: "notification", icon: <Bell size={22} /> },
    { name: "메시지", path: "/so:lo/message", icon: <MessageCircle size={22} /> },
    { name: "설정", path: "/so:lo/setting", icon: <Settings size={22} /> },
    { name: "로그아웃", path: "/so:lo/login", icon: <LogOut size={22} /> }
  ];

  return (
    <aside className="feed-sidebar">
      <div className="sidebar-logo">
        <img
          className="sidebar-logo-mini"
          src={soloLogoMini}
          alt="SO:LO"
        />
        <img
          className="sidebar-logo-full"
          src={soloLogo}
          alt="SO:LO"
        />
      </div>

      <nav>
        {menuList.map((menu) => (
          <button
            className={`feed-menu-item ${menu.name === "로그아웃" ? "logout-menu-item" : ""
              }`}
            key={menu.name}
            onClick={() => {
              if (menu.name === "프로필") {
                if (!loginUserId) {
                  navigate("/so:lo/login");
                  return;
                }

                navigate(`/so:lo/profile/${loginUserId}`);
                return;
              }

              if (menu.name === "검색") {
                setNotificationOpen(false);
                setSearchOpen((prev) => !prev);
                return;
              }

              if (menu.name === "알림") {
                setSearchOpen(false);
                setNotificationOpen((prev) => !prev);
                return;
              }

              if (menu.name === "로그아웃") {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/so:lo/login");
                return;
              }

              setNotificationOpen(false);
              setSearchOpen(false);
              navigate(menu.path);
            }}
          >
            <span className="feed-menu-icon">
              {menu.icon}

              {menu.name === "알림" && unreadCount > 0 && (
                <span className="sidebar-notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>

            <span className="feed-menu-text">{menu.name}</span>
          </button>
        ))}
      </nav>
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        onUnreadCountChange={loadUnreadCount}
      />
    </aside>
  );
}

export default Sidebar;