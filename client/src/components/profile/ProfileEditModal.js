// 프로필 수정 모달

import React, { useState } from "react";
import axios from "axios";

function ProfileEditModal({ profile, onClose, onUpdate }) {
    const [form, setForm] = useState({
        userNickname: profile.userNickname || "",
        userIntro: profile.userIntro || "",
        profileImg: profile.profileImg || ""
    });

    const [nicknameChecked, setNicknameChecked] = useState(true);
    const [message, setMessage] = useState("");
    const [profileFile, setProfileFile] = useState(null);
    const [previewImg, setPreviewImg] = useState(profile.profileImg || "");
    const [deleteProfileImg, setDeleteProfileImg] = useState(false);

    const nicknameRegex = /^[a-zA-Z0-9._]{2,20}$/;

    const changeInput = (e) => {
        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: value
        });

        if (name === "userNickname") {
            setNicknameChecked(value === profile.userNickname);
            setMessage("");
        }
    };

    const checkNickname = async () => {
        if (!nicknameRegex.test(form.userNickname)) {
            setMessage("닉네임은 영문, 숫자, _, . 만 가능하며 2~20자여야 합니다.");
            return;
        }

        try {
            const res = await axios.post("http://localhost:3010/user/check-nickname", {
                userNickname: form.userNickname
            });

            setNicknameChecked(true);
            setMessage(res.data.message);
        } catch (err) {
            setNicknameChecked(false);
            setMessage(err.response ? err.response.data.message : "서버 연결 실패");
        }
    };

    const saveProfile = async () => {
        if (!nicknameChecked) {
            setMessage("닉네임 중복 확인을 해주세요.");
            return;
        }

        try {
            const formData = new FormData();

            formData.append("userNickname", form.userNickname);
            formData.append("userIntro", form.userIntro);
            formData.append("deleteProfileImg", deleteProfileImg ? "Y" : "N");

            if (profileFile) {
                formData.append("profileImg", profileFile);
            }

            const res = await axios.put(
                "http://localhost:3010/profile",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "multipart/form-data"
                    }
                }
            );

            if (res.data.result === "success") {
                onUpdate(res.data.profile);
                onClose();
            }
        } catch (err) {
            setMessage(err.response ? err.response.data.message : "서버 연결 실패");
        }
    };

    const handleProfileImgChange = (e) => {
        const file = e.target.files[0];
        const maxSize = 10 * 1024 * 1024;

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setMessage("프로필 사진은 이미지 파일만 업로드할 수 있습니다.");
            e.target.value = "";
            return;
        }

        if (file.size > maxSize) {
            setMessage("프로필 사진은 최대 10MB까지 업로드할 수 있습니다.");
            e.target.value = "";
            return;
        }

        setProfileFile(file);
        setPreviewImg(URL.createObjectURL(file));
        setDeleteProfileImg(false);
        setMessage("");
    };

    return (
        <div className="profile-edit-backdrop" onClick={onClose}>
            <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
                <button className="profile-edit-close" onClick={onClose}>
                    ×
                </button>

                <h3>프로필 수정</h3>

                <div className="profile-edit-preview-wrap">
                    <label className="profile-edit-preview clickable">
                        {previewImg && !deleteProfileImg ? (
                            <img src={previewImg} alt="프로필" />
                        ) : (
                            <div className="profile-edit-empty-img">
                                {form.userNickname ? form.userNickname.slice(0, 1) : "?"}
                            </div>
                        )}

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImgChange}
                            hidden
                        />
                    </label>

                    <p className="profile-edit-img-guide">
                        프로필 사진을 클릭해 변경
                    </p>

                    {previewImg && !deleteProfileImg && (
                        <button
                            type="button"
                            className="profile-edit-delete-img-btn"
                            onClick={() => {
                                setProfileFile(null);
                                setPreviewImg("");
                                setDeleteProfileImg(true);
                            }}
                        >
                            사진 삭제
                        </button>
                    )}
                </div>

                <label>닉네임</label>
                <div className="profile-edit-row">
                    <input
                        name="userNickname"
                        value={form.userNickname}
                        onChange={changeInput}
                        disabled={nicknameChecked && form.userNickname !== profile.userNickname}
                    />

                    <button
                        type="button"
                        onClick={checkNickname}
                        disabled={nicknameChecked}
                    >
                        {nicknameChecked ? "완료" : "확인"}
                    </button>
                </div>

                <label>소개글</label>
                <textarea
                    name="userIntro"
                    value={form.userIntro}
                    onChange={changeInput}
                    maxLength={100}
                    placeholder="소개글을 입력하세요."
                />

                {message && <p className="profile-edit-message">{message}</p>}

                <div className="profile-edit-actions">
                    <button type="button" onClick={onClose}>
                        취소
                    </button>

                    <button type="button" onClick={saveProfile}>
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfileEditModal;