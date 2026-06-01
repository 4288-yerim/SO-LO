import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../css/user/FindPassword.css";
import logo from "../../assets/soloLogo.png";

function FindPassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userId: "",
    userPhone: "",
    authCode: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("guide");
  const [sendDisabled, setSendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const changeInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    setMessage("");
    setMessageType("guide");
  };

  const sendCode = async () => {
    if (!form.userId || !form.userPhone) {
      setMessage("아이디와 휴대폰 번호를 입력해주세요.");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3010/user/find-password/send-code",
        {
          userId: form.userId,
          userPhone: form.userPhone
        }
      );

      setMessage(res.data.message);
      setMessageType("success");
      setSendDisabled(true);
      setCountdown(300);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSendDisabled(false);
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setMessage(
        err.response ? err.response.data.message : "서버 연결 실패"
      );
      setMessageType("error");
    }
  };

  const verifyCode = async () => {
    if (!form.authCode) {
      setMessage("인증번호를 입력해주세요.");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3010/user/find-password/verify-code",
        {
          userId: form.userId,
          userPhone: form.userPhone,
          authCode: form.authCode
        }
      );

      setVerified(true);
      setMessage(res.data.message);
      setMessageType("success");
    } catch (err) {
      setVerified(false);
      setMessage(
        err.response ? err.response.data.message : "서버 연결 실패"
      );
      setMessageType("error");
    }
  };

  const resetPassword = async () => {
    if (!verified) {
      setMessage("휴대폰 인증을 완료해주세요.");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3010/user/find-password/reset",
        {
          userId: form.userId,
          userPhone: form.userPhone,
          newPassword: form.newPassword,
          confirmPassword: form.confirmPassword
        }
      );

      sessionStorage.removeItem("signupData");
      navigate("/so:lo/login");
    } catch (err) {
      setMessage(
        err.response ? err.response.data.message : "서버 연결 실패"
      );
      setMessageType("error");
    }
  };

  return (
    <div className="find-password-page">
      <div className="find-password-container">
        <div className="find-password-logo">
          <img src={logo} alt="SO:LO" />
        </div>

        <section className="find-password-card">
          <div className="find-password-header">
            <h2>비밀번호 찾기</h2>
            <p>가입한 아이디와 전화번호 인증으로 비밀번호를 다시 설정해요.</p>
          </div>

          <div className="find-password-form">
            <input
              name="userId"
              placeholder="아이디"
              value={form.userId}
              onChange={changeInput}
              disabled={verified}
            />

            <div className="find-password-row">
              <input
                name="userPhone"
                placeholder="전화번호"
                value={form.userPhone}
                onChange={changeInput}
                disabled={sendDisabled || verified}
              />

              <button
                type="button"
                className="find-password-sub-button"
                onClick={sendCode}
                disabled={sendDisabled || verified}
              >
                {verified
                  ? "완료"
                  : sendDisabled
                  ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                  : "발송"}
              </button>
            </div>

            <div className="find-password-row">
              <input
                name="authCode"
                placeholder="인증번호"
                value={form.authCode}
                onChange={changeInput}
                disabled={verified}
              />

              <button
                type="button"
                className="find-password-sub-button"
                onClick={verifyCode}
                disabled={verified}
              >
                {verified ? "완료" : "확인"}
              </button>
            </div>

            {verified && (
              <>
                <input
                  name="newPassword"
                  type="password"
                  placeholder="새 비밀번호"
                  value={form.newPassword}
                  onChange={changeInput}
                />

                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="새 비밀번호 확인"
                  value={form.confirmPassword}
                  onChange={changeInput}
                />
              </>
            )}

            <p className={`find-password-message ${messageType}`}>
              {message}
            </p>

            <button
              type="button"
              className="find-password-main-button"
              onClick={resetPassword}
            >
              비밀번호 변경
            </button>

            <button
              type="button"
              className="find-password-back-button"
              onClick={() => navigate("/so:lo/login")}
            >
              로그인으로 돌아가기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FindPassword;