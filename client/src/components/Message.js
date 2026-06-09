import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";
import { authFetch } from "./routes/authFetch";
import "../css/Message.css";

function Message() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedRoomNo = searchParams.get("roomNo");

  const [roomList, setRoomList] = useState([]);
  const [messageList, setMessageList] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [otherLastReadMessageNo, setOtherLastReadMessageNo] = useState(0);

  const messageEndRef = useRef(null);
  const socketRef = useRef(null);

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

    function formatMessageTime(dateValue) {
      if (!dateValue) return "";

      const date = new Date(dateValue);
      const now = new Date();

      if (Number.isNaN(date.getTime())) return "";

      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

      if (isToday) {
        return date.toLocaleTimeString("ko-KR", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });
      }

      if (isYesterday) {
        return "어제";
      }

      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }

 useEffect(() => {
  if (!token) return;

  const cleanToken = token.replace(/^Bearer\s+/i, "");

    socketRef.current = io("http://localhost:3010", {
      auth: {
        token: cleanToken
      }
    });

    socketRef.current.on("receiveMessage", (data) => {
      if (String(data.roomNo) !== String(selectedRoomNo)) {
        loadRoomList();
        return;
      }

      setMessageList((prev) => {
        const exists = prev.some(
          (item) => item.messageNo === data.message.messageNo
        );

        if (exists) return prev;

        return [...prev, data.message];
      });

      readRoom(data.roomNo);
      loadRoomList();
    });

    socketRef.current.on("readMessage", (data) => {
      if (String(data.roomNo) !== String(selectedRoomNo)) return;

      if (data.userId !== loginUserId) {
        setOtherLastReadMessageNo(
          data.lastReadMessageNo || 0
        );
      }

      loadRoomList();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, selectedRoomNo]);

  function loadRoomList() {
    authFetch("http://localhost:3010/dm/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setRoomList(data.roomList || []);

          if (selectedRoomNo) {
            const room = (data.roomList || []).find(
              (item) => String(item.roomNo) === String(selectedRoomNo)
            );

            setSelectedRoom(room || null);
          }
        } else {
          setMessage(data.message || "메시지 목록을 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("DM room list error:", err);
        setMessage("메시지 목록을 불러오지 못했습니다.");
      });
  }

  function loadMessageList(roomNo) {
    if (!roomNo) return;

    authFetch(`http://localhost:3010/dm/rooms/${roomNo}/messages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setMessageList(data.messageList || []);
          setOtherLastReadMessageNo(
            data.otherLastReadMessageNo || 0
          );

          readRoom(roomNo);
        } else {
          setMessage(data.message || "메시지를 불러오지 못했습니다.");
        }
      })
      .catch((err) => {
        console.error("DM message list error:", err);
        setMessage("메시지를 불러오지 못했습니다.");
      });
  }

  function selectRoom(room) {
    setSelectedRoom(room);
    setSearchParams({ roomNo: room.roomNo });
  }

  function sendMessage() {
    const trimmedMessage = messageInput.trim();

    if (!selectedRoom || !trimmedMessage) return;

    authFetch(`http://localhost:3010/dm/rooms/${selectedRoom.roomNo}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: trimmedMessage
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "메시지를 보내지 못했습니다.");
          return;
        }

        setMessageInput("");
        loadRoomList();
      })
      .catch((err) => {
        console.error("DM send error:", err);
        setMessage("메시지를 보내지 못했습니다.");
      });
  }

  function handleMessageKeyDown(e) {
    if (e.key !== "Enter") return;

    e.preventDefault();
    sendMessage();
  }

  function readRoom(roomNo) {
    if (!roomNo) return;

    authFetch(`http://localhost:3010/dm/rooms/${roomNo}/read`, {
      method: "PUT"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          loadRoomList();
        }
      })
      .catch((err) => {
        console.error("DM read error:", err);
      });
  }

  function goOtherProfile() {
    if (!selectedRoom?.otherUserId) return;

    navigate(`/so:lo/profile/${selectedRoom.otherUserId}`);
  }

  function hideRoom(e, roomNo) {
    e.stopPropagation();

    authFetch(`http://localhost:3010/dm/rooms/${roomNo}`, {
      method: "DELETE"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          setMessage(data.message || "채팅방을 숨기지 못했습니다.");
          return;
        }

        if (String(selectedRoomNo) === String(roomNo)) {
          setSelectedRoom(null);
          setMessageList([]);
          setSearchParams({});
        }

        loadRoomList();
      })
      .catch((err) => {
        console.error("DM room hide error:", err);
        setMessage("채팅방을 숨기지 못했습니다.");
      });
  }

  useEffect(() => {
    loadRoomList();
  }, [selectedRoomNo]);

  useEffect(() => {
    if (selectedRoomNo) {
      loadMessageList(selectedRoomNo);
    } else {
      setMessageList([]);
      setSelectedRoom(null);
    }
  }, [selectedRoomNo]);

  useEffect(() => {
    if (!socketRef.current || !selectedRoomNo) return;

    socketRef.current.emit("joinRoom", selectedRoomNo);

    return () => {
      socketRef.current.emit("leaveRoom", selectedRoomNo);
    };
  }, [selectedRoomNo]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messageList]);

  return (
    <div className="message-layout">
      <Sidebar />

      <main className="message-page">
        <section className="message-room-list">
          <h2>메시지</h2>

          {message && <div className="message-alert">{message}</div>}

          {roomList.length === 0 ? (
            <div className="message-empty">아직 메시지가 없습니다.</div>
          ) : (
            roomList.map((room) => (
              <div
                key={room.roomNo}
                role="button"
                tabIndex={0}
                className={`message-room-item ${
                  String(selectedRoomNo) === String(room.roomNo)
                    ? "active"
                    : ""
                }`}
                onClick={() => selectRoom(room)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    selectRoom(room);
                  }
                }}
              >
                <div className="message-room-img-wrap">
                  {room.otherProfileImg ? (
                    <img src={room.otherProfileImg} alt={room.otherNickname} />
                  ) : (
                    <div className="message-room-img-empty">
                      {room.otherNickname
                        ? room.otherNickname.slice(0, 1)
                        : "?"}
                    </div>
                  )}
                </div>

                <div className="message-room-info">
                  <div className="message-room-top">
                    <strong>{room.otherNickname}</strong>
                    <span className="message-room-time">
                      {formatMessageTime(room.lastMessageDate)}
                    </span>
                  </div>

                  <p>{room.lastMessage || "아직 메시지가 없습니다."}</p>
                </div>

                <div className="message-room-side">
                  {room.unreadCount > 0 && (
                    <span className="message-unread-count">
                      {room.unreadCount > 99 ? "99+" : room.unreadCount}
                    </span>
                  )}

                  <button
                    type="button"
                    className="message-room-hide-btn"
                    onClick={(e) => hideRoom(e, room.roomNo)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="message-chat-area">
          {!selectedRoom ? (
            <div className="message-chat-empty">
              대화할 메시지를 선택해주세요.
            </div>
          ) : (
            <>
              <div className="message-chat-header">
                <button
                  type="button"
                  className="message-chat-profile"
                  onClick={goOtherProfile}
                >
                  <div className="message-chat-img-wrap">
                    {selectedRoom.otherProfileImg ? (
                      <img
                        src={selectedRoom.otherProfileImg}
                        alt={selectedRoom.otherNickname}
                      />
                    ) : (
                      <div className="message-room-img-empty">
                        {selectedRoom.otherNickname
                          ? selectedRoom.otherNickname.slice(0, 1)
                          : "?"}
                      </div>
                    )}
                  </div>

                  <strong>{selectedRoom.otherNickname}</strong>
                </button>
              </div>

              <div className="message-chat-body">
                {messageList.map((item) => {
                  const isMine = item.userId === loginUserId;

                  return (
                    <div
                      key={item.messageNo}
                      className={`message-bubble-row ${isMine ? "mine" : "other"
                        }`}
                    >
                      <div className="message-bubble-wrap">
                        <div className="message-bubble">
                          {item.message}
                        </div>

                        <div className="message-bubble-meta">
                          {isMine &&
                            Number(item.messageNo) > Number(otherLastReadMessageNo) && (
                              <span className="message-read-status">
                                1
                              </span>
                            )}

                          <span className="message-bubble-time">
                            {formatMessageTime(item.cdate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messageEndRef} />
              </div>

              <div className="message-input-area">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  placeholder="메시지를 입력하세요"
                />

                <button type="button" onClick={sendMessage}>
                  전송
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Message;