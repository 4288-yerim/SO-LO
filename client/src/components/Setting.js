import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../css/Setting.css";

function Setting() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.userId;

  const [privacyForm, setPrivacyForm] = useState({
    dmScope: "ALL",
    followVisible: "ALL",
    aloneVisible: "ALL",
    likeVisible: "ALL",
    postVisible: "ALL",
    likePostVisible: "ALL"
  });

  const [notiForm, setNotiForm] = useState({
    dmNoti: "Y",
    commentNoti: "Y",
    followNoti: "Y",
    likeNoti: "Y"
  });

  const [userInfo, setUserInfo] = useState({
    userBiz: "N",
    userPhone: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [phoneForm, setPhoneForm] = useState({
    newPhone: "",
    authCode: ""
  });

  const [phoneTimer, setPhoneTimer] = useState(0);
  const [modalError, setModalError] = useState("");

  const [blockList, setBlockList] = useState([]);
  const [notiUserList, setNotiUserList] = useState([]);

  const [modal, setModal] = useState({
    open: false,
    type: "",
    title: "",
    message: "",
    onConfirm: null
  });

  const openModal = (type, title = "", message = "", onConfirm = null) => {
    setModal({
      open: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeModal = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });

    setPhoneForm({
      newPhone: "",
      authCode: ""
    });

    setModalError("");

    setModal({
      open: false,
      type: "",
      title: "",
      message: "",
      onConfirm: null
    });
  };

  const alertConfirm = () => {
    const callback = modal.onConfirm;
    closeModal();

    if (callback) {
      callback();
    }
  };

  const loadSetting = () => {
    if (!userId) {
      openModal("alert", "로그인 필요", "로그인이 필요합니다.", () => navigate("/login"));
      return;
    }

    fetch(`http://localhost:3010/setting/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result !== "success") {
          openModal("alert", "조회 실패", data.message);
          return;
        }

        setUserInfo({
          userBiz: data.user.USER_BIZ,
          userPhone: data.user.USER_PHONE
        });

        setPrivacyForm({
          dmScope: data.privacy.DM_SCOPE,
          followVisible: data.privacy.FOLLOW_VISIBLE,
          aloneVisible: data.privacy.ALONE_VISIBLE,
          likeVisible: data.privacy.LIKE_VISIBLE,
          postVisible: data.privacy.POST_VISIBLE,
          likePostVisible: data.privacy.LIKE_POST_VISIBLE
        });

        setNotiForm({
          dmNoti: data.noti.DM_NOTI,
          commentNoti: data.noti.COMMENT_NOTI,
          followNoti: data.noti.FOLLOW_NOTI,
          likeNoti: data.noti.LIKE_NOTI
        });

        setBlockList(data.blockList || []);
      })
      .catch((err) => {
        console.error(err);
        openModal("alert", "조회 실패", "설정 정보를 불러오지 못했습니다.");
      });
  };

  const loadNotiUserList = () => {
    fetch(`http://localhost:3010/setting/noti-user/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setNotiUserList(data.list || []);
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadSetting();
  }, []);

  useEffect(() => {
    if (phoneTimer <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setPhoneTimer(phoneTimer - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phoneTimer]);

  const handlePrivacyChange = (e) => {
    const { name, value } = e.target;
    setPrivacyForm({ ...privacyForm, [name]: value });
  };

  const handleNotiChange = (e) => {
    const { name, checked } = e.target;
    setNotiForm({ ...notiForm, [name]: checked ? "Y" : "N" });
  };

  const savePrivacy = () => {
    fetch("http://localhost:3010/setting/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...privacyForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          openModal("alert", "저장 완료", "설정이 저장되었습니다.");
        } else {
          openModal("alert", "저장 실패", data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        openModal("alert", "저장 실패", "공개범위 저장 중 오류가 발생했습니다.");
      });
  };

  const saveNoti = () => {
    fetch("http://localhost:3010/setting/noti", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...notiForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          openModal("alert", "저장 완료", "알림 설정이 저장되었습니다.");
        } else {
          openModal("alert", "저장 실패", data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        openModal("alert", "저장 실패", "알림 설정 저장 중 오류가 발생했습니다.");
      });
  };

  const changePassword = () => {
    setModalError("");

    fetch("http://localhost:3010/setting/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...passwordForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
          });

          openModal("alert", "변경 완료", data.message);
          return;
        }

        setModalError(data.message);
      })
      .catch((err) => {
        console.error(err);
        setModalError("비밀번호 변경 중 오류가 발생했습니다.");
      });
  };

  const sendPhoneCode = () => {
    setModalError("");

    fetch("http://localhost:3010/setting/phone/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPhone: phoneForm.newPhone })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPhoneTimer(300);
          setModalError("");
          return;
        }

        setModalError(data.message);
      })
      .catch((err) => {
        console.error(err);
        setModalError("인증번호 발송 중 오류가 발생했습니다.");
      });
  };

  const changePhone = () => {
    fetch("http://localhost:3010/setting/phone", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...phoneForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPhoneForm({ newPhone: "", authCode: "" });
          loadSetting();
          openModal("alert", "변경 완료", data.message);
        } else {
          setModalError(data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        setModalError("전화번호 변경 중 오류가 발생했습니다.");
      });
  };

  const changeBusiness = () => {
    fetch("http://localhost:3010/setting/business", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          loadSetting();
          openModal("alert", "전환 완료", data.message);
        } else {
          openModal("alert", "전환 실패", data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        openModal("alert", "전환 실패", "비즈니스 계정 전환 중 오류가 발생했습니다.");
      });
  };

  const unblockUser = (blockNo) => {
    fetch(`http://localhost:3010/setting/block/${blockNo}`, {
      method: "DELETE"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          loadSetting();
          openModal("block", "차단 해제", data.message);
        } else {
          openModal("block", "차단 해제 실패", data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        openModal("block", "차단 해제 실패", "차단 해제 중 오류가 발생했습니다.");
      });
  };

  const deleteNotiUser = (notiUserNo) => {
    fetch(`http://localhost:3010/setting/noti-user/${notiUserNo}`, {
      method: "DELETE"
    })
      .then((res) => res.json())
      .then((data) => {
        loadNotiUserList();

        if (data.result === "success") {
          openModal("notiUser", "특정 유저 알림 관리", "알림이 해제되었습니다.");
        } else {
          openModal("notiUser", "특정 유저 알림 관리", data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        openModal("notiUser", "특정 유저 알림 관리", "특정 유저 알림 해제 중 오류가 발생했습니다.");
      });
  };

  const withdrawUser = () => {
    fetch("http://localhost:3010/setting/withdraw", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          openModal("alert", "탈퇴 완료", data.message, () => navigate("/login"));
        } else {
          openModal("alert", "탈퇴 실패", data.message);
        }
      });
  };

  return (
    <div className="setting-page">
      <Sidebar />

      <main className="setting-main">
        <section className="setting-title-box">
          <h2>설정</h2>
          <p>공개범위, 알림, 계정 정보를 관리할 수 있습니다.</p>
        </section>

        <section className="setting-section">
          <div className="setting-section-title">
            <h3>공개범위 설정</h3>
            <button onClick={savePrivacy}>저장</button>
          </div>

          <div className="setting-list">
            <SettingSelect title="DM" desc="나에게 메시지를 보낼 수 있는 범위" name="dmScope" value={privacyForm.dmScope} onChange={handlePrivacyChange} />
            <SettingSelect title="팔로우 목록" desc="내 팔로우/팔로워 목록 공개범위" name="followVisible" value={privacyForm.followVisible} onChange={handlePrivacyChange} />
            <SettingSelect title="SO:LOG" desc="내 혼자 활동 기록 공개범위" name="aloneVisible" value={privacyForm.aloneVisible} onChange={handlePrivacyChange} />
            <SettingSelect title="좋아요 수" desc="내 글의 좋아요 수 공개범위" name="likeVisible" value={privacyForm.likeVisible} onChange={handlePrivacyChange} />
            <SettingSelect title="게시글" desc="내 게시글 공개범위" name="postVisible" value={privacyForm.postVisible} onChange={handlePrivacyChange} post />
            <SettingSelect title="좋아요한 글" desc="내가 좋아요한 글 목록 공개범위" name="likePostVisible" value={privacyForm.likePostVisible} onChange={handlePrivacyChange} />
          </div>
        </section>

        <section className="setting-section">
          <div className="setting-section-title">
            <h3>알림 설정</h3>
            <button onClick={saveNoti}>저장</button>
          </div>

          <div className="setting-list">
            <CheckRow title="DM 알림" name="dmNoti" checked={notiForm.dmNoti === "Y"} onChange={handleNotiChange} />
            <CheckRow title="댓글 알림" name="commentNoti" checked={notiForm.commentNoti === "Y"} onChange={handleNotiChange} />
            <CheckRow title="팔로우 알림" name="followNoti" checked={notiForm.followNoti === "Y"} onChange={handleNotiChange} />
            <CheckRow title="좋아요 알림" name="likeNoti" checked={notiForm.likeNoti === "Y"} onChange={handleNotiChange} />

            <ActionRow
              title="특정 유저 알림 관리"
              desc="알림 받기로 설정한 유저 목록을 관리합니다."
              buttonText="관리하기"
              onClick={() => {
                loadNotiUserList();
                openModal("notiUser", "특정 유저 알림 관리", "");
              }}
            />
          </div>
        </section>

        <section className="setting-section">
          <div className="setting-section-title">
            <h3>계정 설정</h3>
          </div>

          <div className="setting-list">
            <ActionRow title="비밀번호 변경" desc="현재 비밀번호 확인 후 새 비밀번호로 변경합니다." buttonText="변경하기" onClick={() => openModal("password", "비밀번호 변경", "")} />
            <ActionRow title="전화번호 변경" desc="전화번호를 변경합니다." buttonText="변경하기" onClick={() => openModal("phone", "전화번호 변경", "")} />
            <ActionRow
              title="비즈니스 계정"
              desc={
                userInfo.userBiz === "Y"
                  ? "현재 비즈니스 계정입니다."
                  : "일반 계정을 비즈니스 계정으로 전환합니다."
              }
              buttonText={
                userInfo.userBiz === "Y"
                  ? "전환됨"
                  : "전환하기"
              }
              disabled={userInfo.userBiz === "Y"}
              onClick={() =>
                openModal(
                  "business",
                  "비즈니스 계정 전환",
                  `비즈니스 계정으로 전환 후 다시 일반 계정으로 전환하실 수 없습니다.

            비즈니스 계정으로 전환하실 경우 광고 글 작성이 가능합니다.

            광고 글은 노출 타겟과 업체 또는 제품 링크 설정이 가능합니다.
            

            비즈니스 계정으로 전환하시겠습니까?`
                )
              }
            />
            <ActionRow title="차단한 회원 관리" desc="차단한 회원 목록을 확인하고 차단을 취소할 수 있습니다." buttonText="관리하기" onClick={() => openModal("block", "차단한 회원 관리", "")} />
            <ActionRow title="탈퇴하기" desc="계정을 삭제하지 않고 탈퇴 상태로 변경합니다." buttonText="탈퇴하기" danger onClick={() => openModal("withdraw", "회원 탈퇴", "정말 탈퇴하시겠습니까? 탈퇴 후 계정은 사용할 수 없습니다.")} />
          </div>
        </section>
      </main>

      {modal.open && (
        <div className="setting-modal-bg">
          <div className="setting-modal">
            <h3>{modal.title}</h3>
            {modal.message && <p>{modal.message}</p>}

            {modal.type === "password" && (
              <div className="modal-form">
                <input type="password" name="currentPassword" placeholder="현재 비밀번호" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
                <input type="password" name="newPassword" placeholder="새 비밀번호" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                <input type="password" name="confirmPassword" placeholder="비밀번호 확인" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                {modalError && <p className="modal-error-text">{modalError}</p>}
              </div>
            )}

            {modal.type === "phone" && (
              <div className="modal-form">
                <input
                  type="text"
                  name="newPhone"
                  placeholder="변경할 전화번호"
                  value={phoneForm.newPhone}
                  disabled={phoneTimer > 0}
                  onChange={(e) => setPhoneForm({ ...phoneForm, newPhone: e.target.value })}
                />

                <button
                  className="modal-sub-btn"
                  onClick={sendPhoneCode}
                  disabled={phoneTimer > 0}
                >
                  {phoneTimer > 0
                    ? `${Math.floor(phoneTimer / 60)}:${String(phoneTimer % 60).padStart(2, "0")}`
                    : "인증번호 전송"}
                </button>
                <input type="text" name="authCode" placeholder="인증번호" value={phoneForm.authCode} onChange={(e) => setPhoneForm({ ...phoneForm, authCode: e.target.value })} />
                {modalError && <p className="modal-error-text">{modalError}</p>}
              </div>
            )}

            {modal.type === "block" && (
              <div className="modal-list">
                {blockList.length === 0 ? (
                  <p className="empty-text">차단한 회원이 없습니다.</p>
                ) : (
                  blockList.map((item) => (
                    <div className="modal-list-row" key={item.BLOCK_NO}>
                      <div>
                        <strong>{item.USER_NICKNAME}</strong>
                        <p>{item.BLOCKED_ID}</p>
                      </div>
                      <button onClick={() => unblockUser(item.BLOCK_NO)}>차단 취소</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {modal.type === "notiUser" && (
              <div className="modal-list">
                {notiUserList.length === 0 ? (
                  <p className="empty-text">알림 받기로 설정한 유저가 없습니다.</p>
                ) : (
                  notiUserList.map((item) => (
                    <div className="modal-list-row" key={item.NOTI_USER_NO}>
                      <div>
                        <strong>{item.USER_NICKNAME}</strong>
                        <p>{item.TARGET_USER_ID}</p>
                      </div>

                      <button onClick={() => deleteNotiUser(item.NOTI_USER_NO)}>
                        알림 해제
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="setting-modal-btns">
              {modal.type !== "alert" && (
                <button className="modal-cancel-btn" onClick={closeModal}>
                  취소
                </button>
              )}

              {modal.type === "alert" && (
                <button className="modal-ok-btn" onClick={alertConfirm}>
                  확인
                </button>
              )}

              {modal.type === "password" && (
                <button className="modal-ok-btn" onClick={changePassword}>
                  변경
                </button>
              )}

              {modal.type === "phone" && (
                <button className="modal-ok-btn" onClick={changePhone}>
                  변경
                </button>
              )}

              {modal.type === "business" && (
                <button className="modal-ok-btn" onClick={changeBusiness}>
                  전환
                </button>
              )}

              {modal.type === "withdraw" && (
                <button className="modal-danger-btn" onClick={withdrawUser}>
                  탈퇴
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingSelect({ title, desc, name, value, onChange, post }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
      <select name={name} value={value} onChange={onChange}>
        <option value="ALL">전체 공개</option>
        <option value="FRD">상호 팔로잉만 공개</option>
        <option value="FLW">나를 팔로우한 사람만 공개</option>
        {!post && <option value="OFF">전체 비공개</option>}
      </select>
    </div>
  );
}

function CheckRow({ title, name, checked, onChange }) {
  return (
    <label className="setting-check-row">
      <span>{title}</span>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
    </label>
  );
}

function ActionRow({ title, desc, buttonText, onClick, disabled, danger }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
      <button className={danger ? "setting-row-btn danger" : "setting-row-btn"} onClick={onClick} disabled={disabled}>
        {buttonText}
      </button>
    </div>
  );
}

export default Setting;