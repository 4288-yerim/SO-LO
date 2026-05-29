import React, { useState } from "react";
import { Button, TextField, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "../css/Login.css";
import soloLogo from "../assets/soloLogo.png";

function Login() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    userId: "",
    userPwd: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async () => {
    setErrorMessage("");
    if (!form.userId || !form.userPwd) {
      setErrorMessage("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3010/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/so:lo/feed");
    } catch (err) {
      setErrorMessage("서버 오류가 발생했습니다.");
    }
  };

  return (
    <div className="login-page">
      <Paper
        elevation={0}
        className="login-box"
        sx={{
          width: "420px",
          padding: "40px",
          borderRadius: "18px",
          border: "1px solid #e3ded5"
        }}
      >
        <div className="login-logo-wrap">
          <img src={soloLogo} alt="SO:LO" className="login-logo-img" />
        </div>

        {/* <p className="login-slogan">Social for Lone Moments</p> */}

        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
            }}
            >
            <TextField
                fullWidth
                label="아이디"
                name="userId"
                value={form.userId}
                onChange={handleChange}
                margin="normal"
            />

            <TextField
                fullWidth
                label="비밀번호"
                name="userPwd"
                type="password"
                value={form.userPwd}
                onChange={handleChange}
                margin="normal"
            />

            <Button
                fullWidth
                type="submit"
                variant="contained"
                sx={{
                marginTop: "24px",
                padding: "11px 0",
                backgroundColor: "#2f2a24",
                borderRadius: "8px",
                fontWeight: 700,
                "&:hover": {
                    backgroundColor: "#3a342d"
                }
                }}
            >
                로그인
            </Button>
            </form>

        <p className="login-error">
        {errorMessage}
        </p>

        <div className="login-links">
            <span
                className="login-link"
                onClick={() => navigate("/so:lo/find-id")}
                >
                아이디 찾기
            </span> 
            <span>|</span>
            <span
                className="login-link"
                onClick={() => navigate("/so:lo/find-password")}
                >
                비밀번호 찾기
            </span>
            <span>|</span>
            <span
                className="login-link"
                onClick={() => navigate("/so:lo/signup")}
                >
                회원가입
            </span>
        </div>
      </Paper>
    </div>
  );
}

export default Login;