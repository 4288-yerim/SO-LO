import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../css/user/FindId.css";
import logo from "../../assets/soloLogo.png";

function FindId() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userPhone: "",
    authCode: ""
  });

  const [foundIds, setFoundIds] = useState([]);
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
    if (!form.userPhone) {
      setMessage("휴대폰 번호를 입력해주세요.");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3010/user/find-id/send-code",
        {
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
        "http://localhost:3010/user/find-id/verify-code",
        {
          userPhone: form.userPhone,
          authCode: form.authCode
        }
      );

      setVerified(true);
      setFoundIds(res.data.userIds || []);
      setMessage(res.data.message);
      setMessageType("success");
    } catch (err) {
      setVerified(false);
      setFoundIds([]);
      setMessage(
        err.response ? err.response.data.message : "서버 연결 실패"
      );
      setMessageType("error");
    }
  };

  return (
    <div className="find-id-page">
      <div className="find-id-container">
        <div className="find-id-logo">
          <img src={logo} alt="SO:LO" />
        </div>

        <section className="find-id-card">
          <div className="find-id-header">
            <h2>아이디 찾기</h2>
            <p>가입한 전화번호 인증으로 아이디를 확인해요.</p>
          </div>

          <div className="find-id-form">
            <div className="find-id-row">
              <input
                name="userPhone"
                placeholder="전화번호"
                value={form.userPhone}
                onChange={changeInput}
                disabled={sendDisabled || verified}
              />

              <button
                type="button"
                className="find-id-sub-button"
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

            <div className="find-id-row">
              <input
                name="authCode"
                placeholder="인증번호"
                value={form.authCode}
                onChange={changeInput}
                disabled={verified}
              />

              <button
                type="button"
                className="find-id-sub-button"
                onClick={verifyCode}
                disabled={verified}
              >
                {verified ? "완료" : "확인"}
              </button>
            </div>

            <p className={`find-id-message ${messageType}`}>
              {message}
            </p>

            {verified && (
              <div className="find-id-result">
                <h3>찾은 아이디</h3>

                {foundIds.length > 0 ? (
                  foundIds.map((item) => (
                    <div className="find-id-item" key={item.userId}>
                      <strong>{item.userId}</strong>
                    </div>
                  ))
                ) : (
                  <p>가입된 아이디가 없습니다.</p>
                )}
              </div>
            )}

            <button
              type="button"
              className="find-id-main-button"
              onClick={() => navigate("/so:lo/login")}
            >
              로그인하러 가기
            </button>

            <button
              type="button"
              className="find-id-back-button"
              onClick={() => navigate("/so:lo/find-password")}
            >
              비밀번호 찾기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default FindId;