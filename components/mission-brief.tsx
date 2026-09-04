import { currentLearningObjectives, referenceEquipment } from '@/lib/curriculum';
import styles from './mission-brief.module.css';

export function MissionBrief() {
  return (
    <section className={styles.brief} aria-labelledby="equipment-heading">
      <h2 id="equipment-heading">오늘 사용할 장비</h2>
      <p className={styles.equipment}>{referenceEquipment.name}</p>
      <p>{referenceEquipment.description}</p>
      <h3>이번 실습에서 연습할 것</h3>
      <ul>
        {currentLearningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
      </ul>
      <p className={styles.note}>
        {referenceEquipment.qualification} {referenceEquipment.realEquipmentNote}
      </p>
    </section>
  );
}
