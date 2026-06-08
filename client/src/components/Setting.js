import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../css/Setting.css";

function Setting() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.userId;

  const [privacyForm, setPrivacyForm] = useState({
    accountVisible: "PUB",
    relationBadge: "ALL"
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

  const [privacyEditForm, setPrivacyEditForm] = useState({
    accountVisible: "PUB",
    relationBadge: "ALL"
  });

  const [notiEditForm, setNotiEditForm] = useState({
    dmNoti: "Y",
    commentNoti: "Y",
    followNoti: "Y",
    likeNoti: "Y"
  });

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
          accountVisible: data.user.ACCOUNT_VISIBLE || "PUB",
          relationBadge: data.user.RELATION_BADGE || "ALL"
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

  const handleNotiChange = (e) => {
    const { name, checked } = e.target;
    setNotiForm({ ...notiForm, [name]: checked ? "Y" : "N" });
  };

  const openPrivacyEditModal = () => {
    setPrivacyEditForm({ ...privacyForm });
    openModal("privacy", "공개범위 설정", "");
  };

  const openNotiEditModal = () => {
    setNotiEditForm({ ...notiForm });
    openModal("noti", "알림 설정", "");
  };

  const handlePrivacyEditChange = (e) => {
    const { name, value } = e.target;
    setPrivacyEditForm({ ...privacyEditForm, [name]: value });
  };

  const handleNotiEditChange = (e) => {
    const { name, checked } = e.target;
    setNotiEditForm({ ...notiEditForm, [name]: checked ? "Y" : "N" });
  };

  const savePrivacy = () => {
    fetch("http://localhost:3010/setting/privacy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...privacyEditForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setPrivacyForm({ ...privacyEditForm });

          const savedUser = JSON.parse(localStorage.getItem("user"));

          if (savedUser) {
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...savedUser,
                relationBadge: privacyEditForm.relationBadge
              })
            );
          }

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
      body: JSON.stringify({ userId, ...notiEditForm })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setNotiForm({ ...notiEditForm });
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
          const savedUser = JSON.parse(localStorage.getItem("user"));

          if (savedUser) {
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...savedUser,
                userBiz: "Y",
                relationBadge: "ALL",
                accountVisible: "PUB"
              })
            );
          }

          setPrivacyForm({
            accountVisible: "PUB",
            relationBadge: "ALL"
          });

          setUserInfo((prev) => ({
            ...prev,
            userBiz: "Y"
          }));

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

  function getAccountVisibleLabel(value) {
    const map = {
      PUB: "공개 계정",
      PRV: "비공개 계정"
    };

    return map[value] || "공개 계정";
  }

  return (
    <div className="setting-page">
      <Sidebar />

      <main className="setting-main">
        <section className="setting-title-box">
          <h2>설정</h2>
          <p>공개범위, 알림, 계정 정보를 관리할 수 있습니다.</p>
        </section>

        <div className="setting-section-wrap">
          <div className="setting-section-top">
            <h3>계정 공개 설정</h3>

            <button
              className="setting-row-btn"
              onClick={openPrivacyEditModal}
              disabled={userInfo.userBiz === "Y"}
            >
              {userInfo.userBiz === "Y" ? "수정 불가" : "수정하기"}
            </button>
          </div>
          <section className="setting-section">
            <div className="setting-list">
              <SettingViewRow
                title="계정 공개 상태"
                desc="공개 계정은 모두에게 보이고, 비공개 계정은 나를 팔로우한 사람에게만 보입니다."
                value={getAccountVisibleLabel(privacyForm.accountVisible)}
              />

              <SettingViewRow
                title="관계 뱃지"
                desc="닉네임 옆에 표시되는 나의 소통 성향입니다."
                value={getBadgeLabel(privacyForm.relationBadge)}
              />
            </div>
          </section>
        </div>

        <div className="setting-section-wrap">
          <div className="setting-section-top">
            <h3>알림 설정</h3>

            <button className="setting-row-btn" onClick={openNotiEditModal}>
              수정하기
            </button>
          </div>

          <section className="setting-section">
            <div className="setting-list">
              <SettingViewRow title="DM 알림" value={getYnLabel(notiForm.dmNoti)} />
              <SettingViewRow title="댓글 알림" value={getYnLabel(notiForm.commentNoti)} />
              <SettingViewRow title="팔로우 알림" value={getYnLabel(notiForm.followNoti)} />
              <SettingViewRow title="좋아요 알림" value={getYnLabel(notiForm.likeNoti)} />
            </div>
          </section>
        </div>

        <div className="setting-section-wrap">
          <div className="setting-section-top">
            <h3>계정 설정</h3>
          </div>

          <section className="setting-section">
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
                    

            비즈니스 계정으로 전환하실 경우 공개 계정으로 전환되고 

            관계 뱃지가 편한 대화로 고정되며 광고 글 작성이 가능합니다.


            광고 글은 업체 또는 제품 링크 설정이 가능하고
            
            모든 사용자에게 노출됩니다.
            

            비즈니스 계정으로 전환하시겠습니까?`
                  )
                }
              />
              <ActionRow title="차단한 회원 관리" desc="차단한 회원 목록을 확인하고 차단을 취소할 수 있습니다." buttonText="관리하기" onClick={() => openModal("block", "차단한 회원 관리", "")} />
              <ActionRow title="탈퇴하기" desc="계정을 삭제하지 않고 탈퇴 상태로 변경합니다." buttonText="탈퇴하기" danger onClick={() => openModal("withdraw", "회원 탈퇴", "정말 탈퇴하시겠습니까? 탈퇴 후 계정은 사용할 수 없습니다.")} />
            </div>
          </section>
        </div>
      </main>

      {modal.open && (
        <div className="setting-modal-bg">
          <div className="setting-modal">
            <h3>{modal.title}</h3>
            {modal.message && <p>{modal.message}</p>}

            {modal.type === "privacy" && (
              <div className="modal-form">
                <div className="modal-form">
                  <AccountVisibleSelect
                    title="계정 공개 상태"
                    desc="비공개 계정은 나를 팔로우한 사람에게만 공개합니다."
                    name="accountVisible"
                    value={privacyEditForm.accountVisible}
                    onChange={handlePrivacyEditChange}
                  />

                  <SettingSelect
                    title="관계 뱃지"
                    desc="닉네임 옆에 표시되는 나의 소통 성향입니다."
                    name="relationBadge"
                    value={privacyEditForm.relationBadge}
                    onChange={handlePrivacyEditChange}
                  />
                </div>
              </div>
            )}

            {modal.type === "noti" && (
              <div className="modal-form">
                <CheckRow title="DM 알림" name="dmNoti" checked={notiEditForm.dmNoti === "Y"} onChange={handleNotiEditChange} />
                <CheckRow title="댓글 알림" name="commentNoti" checked={notiEditForm.commentNoti === "Y"} onChange={handleNotiEditChange} />
                <CheckRow title="팔로우 알림" name="followNoti" checked={notiEditForm.followNoti === "Y"} onChange={handleNotiEditChange} />
                <CheckRow title="좋아요 알림" name="likeNoti" checked={notiEditForm.likeNoti === "Y"} onChange={handleNotiEditChange} />
              </div>
            )}

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
                <div className="phone-cert-row">
                  <input
                    type="text"
                    name="newPhone"
                    placeholder="변경할 전화번호"
                    value={phoneForm.newPhone}
                    disabled={phoneTimer > 0}
                    onChange={(e) =>
                      setPhoneForm({
                        ...phoneForm,
                        newPhone: e.target.value
                      })
                    }
                  />

                  <button
                    className="modal-sub-btn"
                    onClick={sendPhoneCode}
                    disabled={phoneTimer > 0}
                  >
                    {phoneTimer > 0
                      ? `${Math.floor(phoneTimer / 60)}:${String(
                        phoneTimer % 60
                      ).padStart(2, "0")}`
                      : "인증번호 전송"}
                  </button>
                </div>
                <div className="phone-auth-row">
                  <input type="text" name="authCode" placeholder="인증번호" value={phoneForm.authCode} onChange={(e) => setPhoneForm({ ...phoneForm, authCode: e.target.value })} />
                  <div className="phone-auth-space"></div>
                </div>
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
                      </div>
                      <button onClick={() => unblockUser(item.BLOCK_NO)}>차단 취소</button>
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

              {modal.type === "privacy" && (
                <button className="modal-ok-btn" onClick={savePrivacy}>
                  확인
                </button>
              )}

              {modal.type === "noti" && (
                <button className="modal-ok-btn" onClick={saveNoti}>
                  확인
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

function getBadgeLabel(value) {
  const map = {
    ALL: "편한 대화",
    FLW: "천천히",
    OFF: "혼자 선호"
  };

  return map[value] || "편한 대화";
}

function getYnLabel(value) {
  return value === "Y" ? "켜짐" : "꺼짐";
}

function SettingViewRow({ title, desc, value }) {
  return (
    <div className="setting-row setting-view-row">
      <div>
        <strong>{title}</strong>
        {desc && <p>{desc}</p>}
      </div>
      <span className="setting-value-text">{value}</span>
    </div>
  );
}

function SettingSelect({ title, desc, name, value, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>

      <select
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="ALL">편한 대화</option>
        <option value="FLW">천천히</option>
        <option value="OFF">혼자 선호</option>
      </select>
    </div>
  );
}

function AccountVisibleSelect({ title, desc, name, value, onChange }) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>

      <select name={name} value={value} onChange={onChange}>
        <option value="PUB">공개 계정</option>
        <option value="PRV">비공개 계정</option>
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