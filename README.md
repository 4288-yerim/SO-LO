# SO:LO (SNS 개인 프로젝트)

## 📌프로젝트 주제
react를 활용한 마케팅 요소가 추가된 SNS 사이트 만들기

---

## 📌프로젝트 소개
SO:LO는 혼밥, 혼술, 혼카페, 혼행 등 혼자만의 활동을 기록하고 공유할 수 있는 SNS 서비스입니다.  
사용자 간 소통과 장소 정보 공유를 통해 1인 활동 문화를 위한 커뮤니티를 제공합니다.  

---

## 📌개발 기간
2026.05.28 ~ 2026.06.08 ( 약 8일간 )

---

## 🛠 사용 기술

<table>
  <tr>
    <th>분류</th>
    <th>기술</th>
  </tr>

  <tr>
    <td><b>Frontend</b></td>
    <td>
      <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"/>
    </td>
  </tr>

  <tr>
    <td><b>Backend</b></td>
    <td>
      <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
      <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white"/>
    </td>
  </tr>

  <tr>
    <td><b>Database</b></td>
    <td>
      <img src="https://img.shields.io/badge/Oracle-F80000?style=for-the-badge&logo=oracle&logoColor=white"/>
    </td>
  </tr>
</table>

---

## 📌기획 및 설계
- [프로젝트 기획 및 설계](./readme-file/solo-project-planning.pdf)
- [DB 설계 및 기능](./readme-file/solo-db-design.xlsx)
- [ERD](./readme-file/ERD.png)

---

## 📌주요 기능
**1. 로그인/회원가입**  
<table>
  <tr>
    <th>로그인</th>
    <th>회원가입</th>
  </tr>
  <tr>
    <th><img src="./readme-file/login.PNG" width="400"></th>
    <th><img src="./readme-file/signup.PNG" width="400"></th>
  </tr>
</table>

- 회원가입 후 로그인 가능
- 전화번호로 전송된 인증번호 입력
- 비밀번호는 bcrypt로 암호화해서 저장

---

**2. 메인 피드 페이지**  
<img width="800" height="450" alt="Image" src="https://github.com/user-attachments/assets/a1e91708-b72c-497c-b5ae-2326cd71eb61" />

- 좌측 메뉴바 (홈, 검색, 프로필, 기록하기, 알림, 메시지, 설정, 로그아웃)
- 상단 카테고리별 현황 (나만 혼자인 것이 아니라는 작은 공감을 전하기 위해 사용자들의 오늘 활동 현황을 시각화)
- 관심사 및 활동 이력을 반영한 피드 추천 리스트

---

**3. 상세보기**  

<img src="./readme-file/view.PNG" width="800" />

- 이미지/영상 슬라이드, 방문한 장소 표시
- 좋아요/댓글 기능
- 작성자가 등록한 태그
- 내가 작성한 기록 수정 및 삭제

---

**4. 댓글 및 좋아요**  

<img width="800" height="450" alt="Image" src="https://github.com/user-attachments/assets/2546d569-4be1-42e0-b438-444e380eddd4" />

---

**5. 기록하기**  

<img src="./readme-file/post1.PNG" width="500" />
<img src="./readme-file/post2.PNG" width="500" />
<img src="./readme-file/post3.PNG" width="500" />

---

**6. 프로필**  
   

---

**7. 메시지**  
   

---

**8. 검색**  

<img width="800" height="450" alt="Image" src="https://github.com/user-attachments/assets/c1f4b98d-f8d4-48b2-bbcc-c4f54fa98ae8" />

---

**9. 알림**  
   
<img width="800" height="450" alt="Image" src="https://github.com/user-attachments/assets/e9df58ab-72b4-41b3-8103-4459ef33d716" />

---

**10. 광고**  

<img width="800" height="450" alt="Image" src="https://github.com/user-attachments/assets/7dbd2155-b0ef-4348-baa2-7a0f2a823230" />

---

