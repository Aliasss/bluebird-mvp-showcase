/**
 * Stepper — 상단 가는 분절 막대 진행 표시 (미니멀 단계 표시).
 *
 * total개의 가는 막대 중 current개를 primary로 채움. PageHeader의 step이 사용.
 * UI 키트 `Stepper2`.
 */
type StepperProps = {
  current: number;
  total: number;
};

export default function Stepper({ current, total }: StepperProps) {
  return (
    <div className="flex gap-1.5 px-5 pb-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
            i < current ? 'bg-primary' : 'bg-background-tertiary'
          }`}
        />
      ))}
    </div>
  );
}
