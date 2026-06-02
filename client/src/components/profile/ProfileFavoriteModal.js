// 업체 찜 모달 (css = Profile.css)

import React from "react";

function ProfileFavoriteModal({
  open,
  folder,
  deleteTargetFolder,
  onClose,
  onCloseDeleteFolder,
  onConfirmDeleteFolder
}) {
  if (deleteTargetFolder) {
    return (
      <div className="favorite-modal-backdrop">
        <div className="favorite-delete-modal">
          <div className="favorite-delete-modal-header">
            <h3>폴더 삭제</h3>

            <button
              type="button"
              className="favorite-modal-close"
              onClick={onCloseDeleteFolder}
            >
              ×
            </button>
          </div>

          <p className="favorite-delete-modal-text">
            {deleteTargetFolder.folderName} 폴더를 삭제하시겠습니까?
          </p>

          <p className="favorite-delete-modal-subtext">
            폴더 안에 저장된 업체도 함께 삭제됩니다.
          </p>

          <div className="favorite-delete-modal-actions">
            <button
              type="button"
              className="favorite-delete-cancel-btn"
              onClick={onCloseDeleteFolder}
            >
              취소
            </button>

            <button
              type="button"
              className="favorite-delete-confirm-btn"
              onClick={onConfirmDeleteFolder}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open || !folder) {
    return null;
  }

  const placeList = folder.placeList || [];

  return (
    <div className="favorite-modal-backdrop">
      <div className="favorite-modal">
        <div className="favorite-modal-header">
          <div>
            <h3>{folder.folderName}</h3>
            {folder.folderInfo && <p>{folder.folderInfo}</p>}
          </div>

          <button
            type="button"
            className="favorite-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="favorite-modal-list">
          {placeList.length === 0 ? (
            <div className="favorite-modal-empty">
              이 폴더에 찜한 업체가 없습니다.
            </div>
          ) : (
            placeList.map((place) => (
              <div className="favorite-modal-place" key={place.favoriteNo}>
                <strong>{place.placeName}</strong>
                <p>{place.placeAddress}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileFavoriteModal;