import {
  PenLine,
  Utensils,
  Wine,
  Briefcase,
  Coffee
} from "lucide-react";
import person from "../../assets/today-person.png";

function TodayCard({ todayStats }) {
  function getTodayStat(categoryNo) {
    return todayStats.find((stat) => stat.category === categoryNo) || {
      count: 0,
      diff: 0
    };
  }

  return (
    <section className="today-card">
      <div className="today-title-box">
        <h2>SO:LO의 오늘</h2>
        <p>오늘, 우리들의 혼자 시간</p>
      </div>

      <div className="today-stats">
        <div className="today-stat">
          <Utensils size={24} />
          <b>혼밥</b>
          <strong>37<span>명</span></strong>
          <p>어제보다 +9</p>
        </div>

        <div className="today-stat">
          <Wine size={24} />
          <b>혼술</b>
          <strong>21<span>명</span></strong>
          <p>어제보다 +4</p>
        </div>

        <div className="today-stat">
          <Briefcase size={24} />
          <b>혼행</b>
          <strong>16<span>명</span></strong>
          <p>어제보다 +5</p>
        </div>

        <div className="today-stat">
          <Coffee size={24} />
          <b>혼카페</b>
          <strong>27<span>명</span></strong>
          <p>어제보다 +3</p>
        </div>

        <div className="today-stat">
          <PenLine size={24} />
          <b>혼놀</b>
          <strong>18<span>명</span></strong>
          <p>어제보다 +7</p>
        </div>
      </div>

      <div className="today-illust">
        <div className="sun" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="hill hill-one" />
        <div className="hill hill-two" />
        <img
          className="today-person-img"
          src={person}
          alt="앉아있는 사람"
        />
      </div>
    </section>
  );
}

export default TodayCard;