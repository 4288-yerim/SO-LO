import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../css/user/SignupPrivacy.css";

import logo from "../../assets/soloLogo.png";
import plazaIcon from "../../assets/plaza.png";
import follower from "../../assets/follower.png";
import distanceIcon from "../../assets/distance.png";
import roomIcon from "../../assets/room.png";


function SignupPrivacy() {
  const navigate = useNavigate();
  const [selectedPrivacy, setSelectedPrivacy] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const privacyOptions = [
    {
      key: "OPEN",
      icon: plazaIcon,
      title: "광장 공유",
      desc: "누구나 자유롭게 내 기록을 발견할 수 있어요.",
      detail: "모든 유저가 DM 신청 및 내 팔로우/팔로잉, 글 등을 볼 수 있어요.",
      privacy: {
        dmScope: "ALL",
        followVisible: "ALL",
        aloneVisible: "ALL",
        likeVisible: "ALL",
        postVisible: "ALL",
        likePostVisible: "ALL",
        relationBadge: "ALL"
      }
    },
    {
      key: "FOLLOWER",
      icon: follower,
      title: "단골 손님",
      desc: "나를 찾아와준 사람들에게만 공개해요.",
      detail: "나를 팔로우한 유저만 DM 신청 및 내 팔로우/팔로잉, 글 등을 볼 수 있어요.",
      privacy: {
        dmScope: "FLW",
        followVisible: "FLW",
        aloneVisible: "FLW",
        likeVisible: "FLW",
        postVisible: "FLW",
        likePostVisible: "FLW",
        relationBadge: "FLW"
      }
    },
    {
      key: "DISTANCE",
      icon: distanceIcon,
      title: "서로",
      desc: "서로 팔로우한 사람들과만 조용히 나눠요.",
      detail: "서로 팔로우한 유저만 DM 신청 및 내 팔로우/팔로잉, 글 등을 볼 수 있어요.",
      privacy: {
        dmScope: "FRD",
        followVisible: "FRD",
        aloneVisible: "FRD",
        likeVisible: "FRD",
        postVisible: "FRD",
        likePostVisible: "FRD",
        relationBadge: "FRD"
      }
    },
    {
      key: "ROOM",
      icon: roomIcon,
      title: "나만의 방",
      desc: "온전히 나만을 위한 기록 공간이에요.",
      detail: "서로 팔로우한 유저만 글을 볼 수 있고, 모든 유저는 DM 신청 및 내 팔로우/팔로잉 등을 볼 수 없어요.",
      privacy: {
        dmScope: "OFF",
        followVisible: "OFF",
        aloneVisible: "OFF",
        likeVisible: "OFF",
        postVisible: "FRD",
        likePostVisible: "OFF",
        relationBadge: "OFF"
      }
    }
  ];

  const completeSignup = async () => {
    setErrorMessage("");

    if (!selectedPrivacy) {
      setErrorMessage("관계 거리 설정을 선택해주세요.");
      return;
    }

    const signupData = JSON.parse(sessionStorage.getItem("signupData"));

    if (!signupData) {
      setErrorMessage("회원가입 정보가 없습니다. 다시 진행해주세요.");
      return;
    }

    const selectedOption = privacyOptions.find(
      (option) => option.key === selectedPrivacy
    );

    try {
      await axios.post("http://localhost:3010/user/signup", {
        ...signupData,
        ...selectedOption.privacy
      });

      sessionStorage.removeItem("signupData");
      navigate("/so:lo/login");
    } catch (err) {
      setErrorMessage(
        err.response ? err.response.data.message : "서버 연결 실패"
      );
    }
  };

  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <div className="privacy-logo-area">
          <img src={logo} alt="SO:LO" />
        </div>

        <section className="privacy-card">
          <div className="privacy-header">
            <h2>관계 거리 설정</h2>
            <p>SO:LO에서 내 활동을 어디까지 공개할지 선택해주세요.</p>
            <p>가입 후 설정에서 관계 거리 설정을 세부적으로 변경 가능합니다.</p>
          </div>

          <div className="privacy-options">
            {privacyOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={
                  selectedPrivacy === option.key
                    ? "privacy-option active"
                    : "privacy-option"
                }
                onClick={() => setSelectedPrivacy(option.key)}
              >
                <div className="privacy-icon">
                  <img
                    src={option.icon}
                    alt={option.title}
                    className="privacy-icon-img"
                  />
                </div>

                <strong>{option.title}</strong>

                <span className="privacy-desc">
                  {option.desc}
                </span>

                <div className="privacy-detail-wrap">
                  <p className="privacy-detail">
                    {option.detail}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <p className="privacy-error">{errorMessage}</p>

          <button
            type="button"
            className="privacy-submit-button"
            onClick={completeSignup}
          >
            SO:LO 시작하기
          </button>
        </section>
      </div>
    </div>
  );
}

export default SignupPrivacy;