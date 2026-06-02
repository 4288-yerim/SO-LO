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
      title: "편한 대화",
      desc: "가벼운 대화는 언제든 괜찮아요.",
      detail: "혼자 있는 시간을 즐기지만 좋은 대화가 있다면 부담 없이 나눌 수 있어요.",
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
      key: "DISTANCE",
      icon: distanceIcon,
      title: "천천히",
      desc: "서두르지 않고 천천히 알아가요.",
      detail: "관계에도 적당한 거리가 필요하다고 생각해요. 자연스럽게 이어지는 소통을 선호해요.",
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
      title: "혼자 선호",
      desc: "혼자만의 시간이 가장 편안해요.",
      detail: "혼자 보내는 시간을 소중하게 생각하며, 꼭 필요한 순간에만 가볍게 소통하는 편이에요.",
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
            <h2>관계 거리 뱃지</h2>
            <p>사람마다 편안하게 느끼는 관계의 거리와 소통 방식은 다를 수 있어요.</p>
            <p>관계 뱃지는 나의 소통 성향을 보여주며, 서로의 방식을 존중하기 위한 표시예요.</p>
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