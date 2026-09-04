/** Reference is generic by user agreement, not a measured commercial product. */
export const referenceEquipment = {
  id: 'generic-manual-eq-refractor',
  name: '소형 굴절망원경 · 수동 적도의',
  description: '무게추가 있는 적도의에 경통을 올리고, 파인더와 접안부를 준비하는 구성입니다.',
  qualification: '특정 제조사 모델을 그대로 재현한 장비는 아닙니다.',
  realEquipmentNote: '실제 장비는 교사의 안내와 해당 장비 설명서에 따라 다루세요.',
} as const;

// Only goals supported by the current interactive course belong on its intro.
export const currentLearningObjectives = [
  '부품 이름과 결합 순서 익히기',
  '고정 장치와 안전한 취급 순서 확인하기',
  '삼각대 수평과 두 축 균형 연습하기',
  '파인더 정렬과 목성 초점 맞추기',
] as const;

export type PlannedStage = {
  id: string;
  title: string;
  objective: string;
  requires: readonly string[];
  evidence: readonly string[];
  legacyParts: readonly string[];
};

/** Design contract only. Do not use as runtime progress or award its evidence. */
export const plannedCurriculum = {
  version: 2,
  status: 'design-only',
  equipmentId: referenceEquipment.id,
  stages: [
    {
      id: 'tripod', title: '관측 준비·삼각대',
      objective: '지지 상태와 기포를 보고 다리 높이와 잠금을 조절한다.',
      requires: [],
      evidence: ['stable-support', 'legs-locked', 'tripod-level'],
      legacyParts: ['v1-tripod'],
    },
    {
      id: 'mount', title: '가대·기본 방향',
      objective: '가대를 고정하고 북쪽·관측지 위도와 극축 방향을 연결한다.',
      requires: ['tripod'],
      evidence: ['mount-seated', 'mount-secured', 'rough-polar-direction'],
      legacyParts: ['v1-mount'],
    },
    {
      id: 'payload', title: '무게추·경통',
      objective: '무게추 안전장치와 경통의 받침·안착·고정을 구분한다.',
      requires: ['mount'],
      evidence: ['counterweight-secured', 'shaft-stop-secured', 'tube-secured'],
      legacyParts: ['v1-counterweight', 'v1-tube'],
    },
    {
      id: 'accessories', title: '관측 부속품',
      objective: '파인더·천정미러·접안렌즈를 관측할 구성으로 장착한다.',
      requires: ['payload'],
      evidence: ['finder-secured', 'diagonal-secured', 'eyepiece-secured'],
      legacyParts: ['v1-finder-installation', 'v1-observation-installation'],
    },
    {
      id: 'balance', title: '두 축 균형',
      objective: '전체 관측 구성에서 두 축의 회전 경향을 시험·조절·재확인한다.',
      requires: ['accessories'],
      evidence: ['ra-tested-balanced', 'dec-tested-balanced', 'clutches-secured'],
      legacyParts: ['v1-balance'],
    },
    {
      id: 'alignment', title: '정렬·목표 탐색',
      objective: '파인더 정렬과 극축 정렬을 구분하고 목표를 주경 시야에 도입한다.',
      requires: ['balance'],
      evidence: ['finder-aligned', 'polar-alignment-checked', 'target-in-view'],
      legacyParts: ['v1-finder-alignment'],
    },
    {
      id: 'observation', title: '초점·관측·리포트',
      objective: '상의 선명도를 비교하고 실제 수행 기록으로 설치 과정을 돌아본다.',
      requires: ['alignment'],
      evidence: ['focus-checked', 'observation-recorded', 'evidence-based-report'],
      legacyParts: ['v1-focus', 'v1-completion'],
    },
  ] satisfies PlannedStage[],
} as const;
