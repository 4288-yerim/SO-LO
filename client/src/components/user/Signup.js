import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../css/user/Signup.css";
import logo from "../../assets/soloLogo.png";

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
  const [errors, setErrors] = useState({
    userId: "",
    userPwd: "",
    confirmUserPwd: "",
    userName: "",
    userNickname: "",
    userPhone: "",
    authCode: "",
    submit: ""
  });
  const [phoneMessage, setPhoneMessage] = useState("");
  const [sendDisabled, setSendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const [idChecked, setIdChecked] = useState(false);
  const [idMessage, setIdMessage] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const idRegex = /^[a-zA-Z0-9]{4,20}$/;
  const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
  const nicknameRegex = /^[a-zA-Z0-9._]{2,20}$/;

  const getUserIdMessage = () => {
    if (errors.userId) {
    return {
      className: "error-message",
      text: errors.userId
    };
  }

  if (!form.userId) {
    return {
      className: "input-guide",
      text: "영문/숫자 4~20자"
    };
  }

    if (!idRegex.test(form.userId)) {
      return {
        className: "error-message",
        text: "아이디는 영문과 숫자만 가능하며 4~20자여야 합니다."
      };
    }

    if (!idChecked) {
      return {
        className: "input-guide",
        text: "아이디 중복 확인을 해주세요."
      };
    }

    return {
      className: "verified-message",
      text: idMessage || "사용 가능한 아이디입니다."
    };
  };

  const getUserPwdMessage = () => {
    if (errors.userPwd) {
      return {
        className: "error-message",
        text: errors.userPwd
      };
    }

    if (!form.userPwd) {
      return {
        className: "input-guide",
        text: "영문+숫자+특수문자 포함 8~20자"
      };
    }

    if (!pwdRegex.test(form.userPwd)) {
      return {
        className: "error-message",
        text: "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다."
      };
    }

    return {
      className: "verified-message",
      text: "사용 가능한 비밀번호입니다."
    };
  };

  const getConfirmPwdMessage = () => {
    if (errors.confirmUserPwd) {
      return {
        className: "error-message",
        text: errors.confirmUserPwd
      };
    }

    if (!form.userPwd && !form.confirmUserPwd) {
      return {
        className: "input-guide",
        text: "비밀번호를 다시 입력해주세요."
      };
    }

    if (form.userPwd !== form.confirmUserPwd) {
      return {
        className: "error-message",
        text: "비밀번호 확인이 일치하지 않습니다."
      };
    }

    return {
      className: "verified-message",
      text: "비밀번호가 일치합니다."
    };
  };

  const getUserNameMessage = () => {
    if (errors.userName) {
      return {
        className: "error-message",
        text: errors.userName
      };
    }

    return {
      className: "input-guide",
      text: "이름을 입력해주세요."
    };
  };

  const getNicknameMessage = () => {
    if (errors.userNickname) {
      return {
        className: "error-message",
        text: errors.userNickname
      };
    }

    if (!form.userNickname) {
      return {
        className: "input-guide",
        text: "영문/숫자/_/. 2~20자"
      };
    }

    if (!nicknameRegex.test(form.userNickname)) {
      return {
        className: "error-message",
        text: "닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다."
      };
    }

    if (!nicknameChecked) {
      return {
        className: "input-guide",
        text: "닉네임 중복 확인을 해주세요."
      };
    }

    return {
      className: "verified-message",
      text: nicknameMessage || "사용 가능한 닉네임입니다."
    };
  };

  const changeInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

    if (e.target.name === "userNickname") {
      setNicknameChecked(false);
      setNicknameMessage("");
    }

    if (e.target.name === "userPhone") {
      setPhoneVerified(false);
      setSendDisabled(false);
      setCountdown(0);
    }
    
  };

  const validateSignup = () => {
    const newErrors = {
      userId: "",
      userPwd: "",
      confirmUserPwd: "",
      userName: "",
      userNickname: "",
      userPhone: "",
      authCode: "",
      submit: ""
    };

    if (!idRegex.test(form.userId)) {
      newErrors.userId = "아이디는 영문과 숫자만 가능하며 4~20자여야 합니다.";
    }

    if (!pwdRegex.test(form.userPwd)) {
      newErrors.userPwd = "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.";
    }

    if (form.userPwd !== form.confirmUserPwd) {
      newErrors.confirmUserPwd = "비밀번호 확인이 일치하지 않습니다.";
    }

    if (!form.userName.trim()) {
      newErrors.userName = "이름을 입력해주세요.";
    }

    if (!nicknameRegex.test(form.userNickname)) {
      newErrors.userNickname = "닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다.";
    }

    setErrors(newErrors);

    return Object.values(newErrors).every((message) => message === "");
  };

  const checkId = async () => {
    const idRegex = /^[a-zA-Z0-9]{4,20}$/;

    if (!idRegex.test(form.userId)) {
      setErrors((prev) => ({
        ...prev,
        userId: "아이디는 영문과 숫자만 가능하며 4~20자여야 합니다."
      }));
      return;
    }

    try {
      const res = await axios.post("http://localhost:3010/user/check-id", {
        userId: form.userId
      });

      setIdChecked(true);
      setIdMessage(res.data.message);

      setErrors((prev) => ({
        ...prev,
        userId: ""
      }));
    } catch (err) {
      setIdChecked(false);

      setErrors((prev) => ({
        ...prev,
        userId: err.response ? err.response.data.message : "서버 연결 실패"
      }));
    }
  };

  const checkNickname = async () => {
    if (!nicknameRegex.test(form.userNickname)) {
      setErrors((prev) => ({
        ...prev,
        userNickname:
          "닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다."
      }));
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:3010/user/check-nickname",
        {
          userNickname: form.userNickname
        }
      );

      setNicknameChecked(true);
      setNicknameMessage(res.data.message);

      setErrors((prev) => ({
        ...prev,
        userNickname: ""
      }));
    } catch (err) {
      setNicknameChecked(false);

      setErrors((prev) => ({
        ...prev,
        userNickname: err.response
          ? err.response.data.message
          : "서버 연결 실패"
      }));
    }
  };

  const sendCode = async () => {
    try {
      const res = await axios.post("http://localhost:3010/user/send-code", {
        userPhone: form.userPhone
      });

      setPhoneMessage(res.data.message);

      setErrors((prev) => ({
        ...prev,
        userPhone: ""
      }));
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
      if (err.response) {
        setErrors((prev) => ({
          ...prev,
          userPhone: err.response.data.message
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          userPhone: "서버 연결 실패"
        }));
      }
    }
  };

  const verifyCode = async () => {
    try {
      const res = await axios.post("http://localhost:3010/user/verify-code", {
        userPhone: form.userPhone,
        authCode: authCode
      });

      setPhoneVerified(true);
    } catch (err) {
      setPhoneVerified(false);

      if (err.response) {
        setErrors((prev) => ({
          ...prev,
          authCode: err.response.data.message
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          authCode: "서버 연결 실패"
        }));
      }
    }
  };

const signup = () => {
  if (!validateSignup()) {
    return;
  }

  if (!nicknameChecked) {
    setErrors((prev) => ({
      ...prev,
      userNickname: "닉네임 중복 확인을 해주세요."
    }));
    return;
  }

  if (!phoneVerified) {
    setErrors((prev) => ({
      ...prev,
      userPhone: "휴대폰 인증을 완료해주세요."
    }));
    return;
  }

  const signupData = {
    userId: form.userId,
    userPwd: form.userPwd,
    userName: form.userName,
    userNickname: form.userNickname,
    userPhone: form.userPhone
  };

  sessionStorage.setItem("signupData", JSON.stringify(signupData));

  navigate("/so:lo/signup-privacy", {
    state: {
      fromSignup: true
    }
  });
};

  return (
<div className="signup-page">

    <div className="signup-container">

        <div className="signup-logo-area">
            <img src={logo} alt="logo" />
        </div>

      <section className="signup-card">
        <div className="signup-header">
          <h2>회원가입</h2>
          <p>혼자만의 순간을 기록할 계정을 만들어보세요.</p>
        </div>

        <div className="signup-form">
          <div className="phone-row">
            <input
              name="userId"
              placeholder="아이디"
              value={form.userId}
              onChange={changeInput}
              disabled={idChecked}
            />

            <button
              type="button"
              className="sub-button"
              onClick={checkId}
              disabled={idChecked}
            >
              {idChecked ? "완료" : "확인"}
            </button>
          </div>

          <p className={getUserIdMessage().className}>
            {getUserIdMessage().text}
          </p>

          {/* <p className={errors.userId ? "error-message" : "input-guide"}>
            {errors.userId || "영문/숫자 4~20자"}
          </p> */}

          <input
            name="userPwd"
            type="password"
            placeholder="비밀번호"
            value={form.userPwd}
            onChange={changeInput}
          />

          <p className={getUserPwdMessage().className}>
            {getUserPwdMessage().text}
          </p>

          <input
            name="confirmUserPwd"
            type="password"
            placeholder="비밀번호 확인"
            value={form.confirmUserPwd}
            onChange={changeInput}
          />

          <p className={getConfirmPwdMessage().className}>
            {getConfirmPwdMessage().text}
          </p>

          <input
            name="userName"
            placeholder="이름"
            value={form.userName}
            onChange={changeInput}
          />

          {getUserNameMessage() && (
            <p className={getUserNameMessage().className}>
              {getUserNameMessage().text}
            </p>
          )}

          <div className="phone-row">
            <input
              name="userNickname"
              placeholder="닉네임"
              value={form.userNickname}
              onChange={changeInput}
              disabled={nicknameChecked}
            />

            <button
              type="button"
              className="sub-button"
              onClick={checkNickname}
              disabled={nicknameChecked}
            >
              {nicknameChecked ? "완료" : "확인"}
            </button>
          </div>

          <p className={getNicknameMessage().className}>
            {getNicknameMessage().text}
          </p>

          <div className="phone-row">
            <input
              name="userPhone"
              placeholder="전화번호"
              value={form.userPhone}
              onChange={changeInput}
              disabled={sendDisabled || phoneVerified}
            />

            <button
              type="button"
              className="sub-button"
              onClick={sendCode}
              disabled={sendDisabled || phoneVerified}
            >
              {phoneVerified
                ? "완료"
                : sendDisabled
                ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
                : "발송"}
            </button>
          </div>

            <p
              className={
                errors.userPhone
                  ? "error-message"
                  : phoneMessage
                  ? "verified-message"
                  : "input-guide"
              }
            >
              {errors.userPhone
                ? errors.userPhone
                : phoneMessage
                ? phoneMessage
                : "전화번호를 입력해주세요."}
            </p>

          <div className="phone-row">
            <input
              placeholder="인증번호"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              disabled={phoneVerified}
            />

            <button
              type="button"
              className="sub-button"
              onClick={verifyCode}
              disabled={phoneVerified}
            >
              {phoneVerified ? "완료" : "확인"}
            </button>
          </div>

            <p
              className={
                phoneVerified
                  ? "verified-message"
                  : errors.authCode
                  ? "error-message"
                  : "input-guide"
              }
            >
              {phoneVerified
                ? "휴대폰 인증이 완료되었습니다."
                : errors.authCode
                ? errors.authCode
                : "전화번호를 입력 후 발송버튼을 눌러주세요."}
            </p>

          <button type="button" className="signup-button" onClick={signup}>
            가입하기
          </button>

          {errors.submit && <p className="error-message">{errors.submit}</p>}

          <div className="signup-login-link">
            <span>이미 SO:LO 회원이신가요?</span>

            <button
              type="button"
              className="signup-login-button"
              onClick={() => navigate("/so:lo/login")}
            >
              로그인
            </button>
          </div>

        </div>
      </section>
    </div>
  </div>
  );
}

export default Signup;