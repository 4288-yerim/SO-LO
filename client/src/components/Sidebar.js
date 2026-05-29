import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  User,
  PenLine,
  Bell,
  MessageCircle,
  Settings,
  Search
} from "lucide-react";

import "../css/Sidebar.css";
import soloLogo from "../assets/soloLogo.png";
import soloLogoMini from "../assets/soloLogo_n.png";

function Sidebar() {
  const navigate = useNavigate();

  const menuList = [
    { name: "홈", path: "/so:lo/feed", icon: <Home size={22} /> },
    { name: "검색", path: "/so:lo/search", icon: <Search size={22} /> },
    { name: "프로필", path: "/so:lo/profile", icon: <User size={22} /> },
    { name: "기록하기", path: "/so:lo/post", icon: <PenLine size={22} /> },
    { name: "알림", path: "/so:lo/notification", icon: <Bell size={22} /> },
    { name: "메시지", path: "/so:lo/message", icon: <MessageCircle size={22} /> },
    { name: "설정", path: "/so:lo/setting", icon: <Settings size={22} /> }
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
            className="feed-menu-item"
            key={menu.name}
            onClick={() => navigate(menu.path)}
          >
            <span className="feed-menu-icon">{menu.icon}</span>
            <span className="feed-menu-text">{menu.name}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;