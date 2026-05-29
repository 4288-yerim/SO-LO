import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const [feedList, setFeedList] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [todayStats, setTodayStats] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3010/feed", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
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
              <article className="feed-card" key={feed.postId}>
              <div className="feed-card-top">
                <div className="feed-user">
                  <div className="feed-profile-img">
                    {feed.userNickname.slice(0, 1)}
                  </div>
                  <strong>{feed.userNickname}</strong>
                  <span>· {getTimeAgo(feed.timeAgo)}</span>
                </div>
              </div>

              <div className="feed-card-body">
                {feed.imageUrl && (
                  feed.fileType === "VID" ? (
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
                  <button>
                    <Heart size={24} />
                    <span>{feed.likeCount}</span>
                  </button>
                  <button>
                    <MessageCircleMore size={24} />
                    <span>{feed.commentCount}</span>
                  </button>
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
    </div>
  );
}

export default Feed;