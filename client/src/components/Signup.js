import { useState } from "react";
import axios from "axios";
import "../css/Signup.css";
import logo from "../assets/soloLogo.png";

function Signup() {
  const [form, setForm] = useState({
    userId: "",
    userPwd: "",
    confirmUserPwd: "",
    userName: "",
    userNickname: "",
    userPhone: ""
  });

  const [authCode, setAuthCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const changeInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    if (e.target.name === "userPhone") {
      setPhoneVerified(false);
    }
  };

  const validateSignup = () => {
    const idRegex = /^[a-zA-Z0-9]{4,20}$/;
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
    const nicknameRegex = /^[a-zA-Z0-9._]{2,20}$/;

    if (!idRegex.test(form.userId)) {
      alert("아이디는 영문과 숫자만 가능하며 4~20자여야 합니다.");
      return false;
    }

    if (!pwdRegex.test(form.userPwd)) {
      alert("비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.");
      return false;
    }

    if (form.userPwd !== form.confirmUserPwd) {
      alert("비밀번호 확인이 일치하지 않습니다.");
      return false;
    }

    if (!nicknameRegex.test(form.userNickname)) {
      alert("닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다.");
      return false;
    }

    return true;
  };

  const sendCode = async () => {
    try {
      const res = await axios.post("http://localhost:3010/user/send-code", {
        userPhone: form.userPhone
      });

      alert(res.data.message);
    } catch (err) {
      if (err.response) {
        alert(err.response.data.message);
      } else {
        alert("서버 연결 실패");
      }
    }
  };

  const verifyCode = async () => {
    try {
      const res = await axios.post("http://localhost:3010/user/verify-code", {
        userPhone: form.userPhone,
        authCode: authCode
      });

      alert(res.data.message);
      setPhoneVerified(true);
    } catch (err) {
      setPhoneVerified(false);

      if (err.response) {
        alert(err.response.data.message);
      } else {
        alert("서버 연결 실패");
      }
    }
  };

  const signup = async () => {
    if (!validateSignup()) {
      return;
    }

    if (!phoneVerified) {
      alert("휴대폰 인증을 완료해주세요.");
      return;
    }

    try {
      const signupData = {
        userId: form.userId,
        userPwd: form.userPwd,
        userName: form.userName,
        userNickname: form.userNickname,
        userPhone: form.userPhone
      };

      const res = await axios.post("http://localhost:3010/user/signup", signupData);

      alert(res.data.message);
    } catch (err) {
      console.log(err);

      if (err.response) {
        alert(err.response.data.message);
      } else {
        alert("서버 연결 실패");
      }
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-logo-area">
        <img src={logo} alt="SO:LO Logo" />
      </div>

      <section className="signup-card">
        <div className="signup-header">
          <h2>회원가입</h2>
          <p>혼자만의 순간을 기록할 계정을 만들어보세요.</p>
        </div>

        <div className="signup-form">
          <input
            name="userId"
            placeholder="아이디"
            value={form.userId}
            onChange={changeInput}
          />

          <p className="input-guide">영문/숫자 4~20자</p>

          <input
            name="userPwd"
            type="password"
            placeholder="비밀번호"
            value={form.userPwd}
            onChange={changeInput}
          />

          <p className="input-guide">영문+숫자+특수문자 포함 8~20자</p>

          <input
            name="confirmUserPwd"
            type="password"
            placeholder="비밀번호 확인"
            value={form.confirmUserPwd}
            onChange={changeInput}
          />

          <input
            name="userName"
            placeholder="이름"
            value={form.userName}
            onChange={changeInput}
          />

          <input
            name="userNickname"
            placeholder="닉네임"
            value={form.userNickname}
            onChange={changeInput}
          />

          <p className="input-guide">영문/숫자/_/. 2~20자</p>

          <div className="phone-row">
            <input
              name="userPhone"
              placeholder="전화번호"
              value={form.userPhone}
              onChange={changeInput}
            />

            <button type="button" className="sub-button" onClick={sendCode}>
              발송
            </button>
          </div>

          <div className="phone-row">
            <input
              placeholder="인증번호"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
            />

            <button type="button" className="sub-button" onClick={verifyCode}>
              확인
            </button>
          </div>

          {phoneVerified && (
            <p className="verified-message">휴대폰 인증이 완료되었습니다.</p>
          )}

          <button type="button" className="signup-button" onClick={signup}>
            SO:LO 시작하기
          </button>
        </div>
      </section>
    </div>
  );
}

export default Signup;