import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "../css/Post.css";
import { Map, MapMarker, CustomOverlayMap } from "react-kakao-maps-sdk";

function Post() {
  const navigate = useNavigate();
  const [categoryList, setCategoryList] = useState([]);

  const [form, setForm] = useState({
    categoryNo: "",
    title: "",
    content: "",
    placeName: "",
    placeAddress: "",
    lat: "",
    lng: "",
    cmtYn: "Y"
  });

  const [selectedTags, setSelectedTags] = useState([]);
  const [tagKeyword, setTagKeyword] = useState("");
  const [tagSearchList, setTagSearchList] = useState([]);
  const [fileList, setFileList] = useState([]);
  const fileInputRef = useRef(null);

  const [message, setMessage] = useState("");
  const [mapCenter, setMapCenter] = useState({
    lat: 37.5665,
    lng: 126.978
  });

  const [placeKeyword, setPlaceKeyword] = useState("");
  const [placeList, setPlaceList] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showPlaceInfo, setShowPlaceInfo] = useState(true);

  useEffect(() => {
  if (!placeKeyword.trim()) {
    setPlaceList([]);
    return;
  }

  const timer = setTimeout(() => {
    if (!window.kakao || !window.kakao.maps) return;

    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(placeKeyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaceList(data);
      } else {
        setPlaceList([]);
      }
    });
  }, 300);

  return () => clearTimeout(timer);
}, [placeKeyword]);

  useEffect(() => {
    fetch("http://localhost:3010/post/category")
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setCategoryList(data.categoryList);
        }
      })
      .catch((err) => {
        console.error("카테고리 불러오기 실패:", err);
      });
  }, []);

  useEffect(() => {
    if (tagKeyword.trim() === "") {
      setTagSearchList([]);
      return;
    }

    fetch(
      `http://localhost:3010/post/tag/search?keyword=${encodeURIComponent(
        tagKeyword
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.result === "success") {
          setTagSearchList(data.tagList);
        }
      })
      .catch((err) => {
        console.error("태그 검색 실패:", err);
      });
  }, [tagKeyword]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });
  };

  const addTag = (tagName) => {
    const cleanTag = tagName.trim().replace(/^#/, "");

    if (!cleanTag) return;

    const exists = selectedTags.some((tag) => tag === cleanTag);

    if (exists) {
      setTagKeyword("");
      setTagSearchList([]);
      return;
    }

    if (selectedTags.length >= 10) {
      setMessage("태그는 최대 10개까지 추가할 수 있습니다.");
      return;
    }

    setSelectedTags([...selectedTags, cleanTag]);
    setTagKeyword("");
    setTagSearchList([]);
    setMessage("");
  };

  const removeTag = (tagName) => {
    setSelectedTags(selectedTags.filter((tag) => tag !== tagName));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagKeyword);
    }
  };

  const handlePlaceSearch = () => {
    if (placeKeyword.trim().length < 2) {
      setPlaceList([]);
      return;
    }

    if (!window.kakao || !window.kakao.maps) {
      alert("카카오맵을 불러오지 못했습니다.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(placeKeyword, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaceList(data);
      } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
        alert("검색 결과가 없습니다.");
        setPlaceList([]);
      } else {
        alert("장소 검색에 실패했습니다.");
        setPlaceList([]);
      }
    });
  };

  const handlePlaceSelect = (place) => {
    const lat = Number(place.y);
    const lng = Number(place.x);

    setForm((prev) => ({
      ...prev,
      placeName: place.place_name,
      placeAddress: place.road_address_name || place.address_name,
      lat,
      lng
    }));

    setMapCenter({
      lat,
      lng
    });

    setSelectedPlace({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat,
      lng
    });

    setShowPlaceInfo(true);

    setPlaceKeyword(place.place_name);
    setPlaceList([]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const maxSize = 200 * 1024 * 1024;

    if (files.length > 5) {
      setMessage("파일은 최대 5개까지 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const tooLargeFile = files.find((file) => file.size > maxSize);

    if (tooLargeFile) {
      setMessage("파일 1개당 최대 200MB까지 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const allowedFiles = files.filter((file) => {
      return file.type.startsWith("image/") || file.type.startsWith("video/");
    });

    if (allowedFiles.length !== files.length) {
      setMessage("이미지 또는 영상 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const previewFiles = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith("image/") ? "image" : "video"
    }));

    setFileList(previewFiles);
    setMessage("");
  };

  const removeFile = (index) => {
    const removeTarget = fileList[index];

    URL.revokeObjectURL(removeTarget.previewUrl);

    const newFileList = fileList.filter(
      (_, fileIndex) => fileIndex !== index
    );

    setFileList(newFileList);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("로그인이 필요합니다.");
      return;
    }

    if (!form.categoryNo || !form.title || !form.content) {
      setMessage("카테고리, 제목, 내용을 입력해주세요.");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("categoryNo", form.categoryNo);
      formData.append("title", form.title);
      formData.append("content", form.content);
      formData.append("placeName", form.placeName);
      formData.append("placeAddress", form.placeAddress);
      formData.append("lat", form.lat);
      formData.append("lng", form.lng);
      formData.append("cmtYn", form.cmtYn);

      selectedTags.forEach((tag) => {
        formData.append("tags", tag);
      });

      fileList.forEach((item) => {
        formData.append("files", item.file);
      });

      const res = await fetch("http://localhost:3010/post/write", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message);
        return;
      }

      navigate("/so:lo/feed", {
        state: {
          toastMessage: "작성이 완료되었습니다."
        }
      });
    } catch (err) {
      console.error("기록 등록 실패:", err);
      setMessage("서버 오류가 발생했습니다.");
    }
  };

  return (
    <div className="write-page">
      <Sidebar />

      <main className="write-main">
        <section className="write-card">
          <h1>기록하기</h1>
          <p className="write-subtitle"></p>

          <form className="write-form" onSubmit={handleSubmit}>
            <label>
              카테고리
              <select
                name="categoryNo"
                value={form.categoryNo}
                onChange={handleChange}
              >
                <option value="">카테고리 선택</option>
                {categoryList.map((category) => (
                  <option
                    key={category.CATEGORY_NO}
                    value={category.CATEGORY_NO}
                  >
                    {category.CATEGORY_NAME}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-group">
              <label>장소 검색</label>

              <div className="place-area">
                <div className="place-search-box">
                  <input
                    type="text"
                    value={placeKeyword}
                    onChange={(e) => setPlaceKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handlePlaceSearch();
                      }
                    }}
                    placeholder="장소를 검색하세요"
                  />

                  <button type="button" onClick={handlePlaceSearch}>
                    검색
                  </button>
                </div>

                {placeList.length > 0 && (
                  <div className="place-result-list">
                    {placeList.map((place) => (
                      <div
                        key={place.id}
                        className="place-result-item"
                        onClick={() => handlePlaceSelect(place)}
                      >
                        <strong>{place.place_name}</strong>
                        <p>{place.road_address_name || place.address_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="write-map-box">
                <Map
                  center={mapCenter}
                  style={{
                    width: "100%",
                    height: "250px"
                  }}
                  level={3}
                >
                  <MapMarker
                    position={mapCenter}
                    onClick={() => setShowPlaceInfo((prev) => !prev)}
                  />

                  {selectedPlace && showPlaceInfo && (
                    <CustomOverlayMap
                      position={{
                        lat: selectedPlace.lat,
                        lng: selectedPlace.lng
                      }}
                      yAnchor={1.76}
                    >
                      <div className="place-map-label">
                        <strong>{selectedPlace.name}</strong>
                        <p>{selectedPlace.address}</p>
                      </div>
                    </CustomOverlayMap>
                  )}
                </Map>
              </div>
            </div>

            <label>
              제목
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={100}
                placeholder="제목을 입력하세요"
              />
            </label>

            <label>
              내용
              <textarea
                name="content"
                value={form.content}
                onChange={handleChange}
                maxLength={5000}
                placeholder="내용을 입력하세요"
              />
            </label>

            <div className="file-field">
              <span className="file-field-label">이미지 / 영상</span>

              <div
                className="file-upload-box"
                onClick={() => fileInputRef.current?.click()}
              >
              <input
                ref={fileInputRef}
                className="file-hidden-input"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
              />

                <div className="file-upload-content">
                  <div className="file-upload-title">
                    📷 이미지 / 영상 추가
                  </div>

                  <div className="file-upload-count">
                    현재 등록 예정 파일 {fileList.length}개
                  </div>
                </div>
              </div>
            </div>

            {fileList.length > 0 && (
              <div className="file-preview-list">
                {fileList.map((item, index) => (
                  <div className="file-preview-item" key={index}>
                    <div className="file-preview-media">
                      {item.type === "image" ? (
                        <img src={item.previewUrl} alt={item.file.name} />
                      ) : (
                        <video src={item.previewUrl} controls />
                      )}
                    </div>

                    <div className="file-preview-info">
                      <span>{item.file.name}</span>
                      <small>{item.type === "image" ? "이미지" : "영상"}</small>
                    </div>

                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label>
              태그
              <div className="tag-input-box">
                <div className="selected-tag-list">
                  {selectedTags.map((tag) => (
                    <span className="selected-tag" key={tag}>
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                
                <div className="tag-search-area">
                  <input
                    type="text"
                    value={tagKeyword}
                    onChange={(e) => setTagKeyword(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="태그를 입력하세요"
                  />

                  {tagSearchList.length > 0 && (
                    <div className="tag-search-list">
                      {tagSearchList.map((tag) => (
                        <button
                          type="button"
                          key={tag.TAG_NO}
                          onClick={() => addTag(tag.TAG_NAME)}
                        >
                          #{tag.TAG_NAME}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </label>

            <label className="toggle-wrapper">
              <span>댓글 허용</span>

              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={form.cmtYn === "Y"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cmtYn: e.target.checked ? "Y" : "N"
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </label>

            {message && <p className="write-message">{message}</p>}

            <button type="submit" className="write-submit-btn">
              기록하기
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default Post;