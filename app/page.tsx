'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  CircleGauge,
  Compass,
  Eye,
  Grip,
  Move,
  RotateCcw,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MissionBrief } from '@/components/mission-brief';
import { TripodLesson } from '@/components/tripod-lesson';
import { MountLesson } from '@/components/mount-lesson';
import { CounterweightLesson } from '@/components/counterweight-lesson';
import { TubeLesson } from '@/components/tube-lesson';
import { ObservingLesson } from '@/components/observing-lesson';
import { AlignmentLesson } from '@/components/alignment-lesson';
import { FocusLesson } from '@/components/focus-lesson';
import { createFocus, restoreFocus, focusReducer, focusReady, FOCUS_STORAGE_KEY, type FocusAction } from '@/lib/focus';
import { createAlignment, restoreAlignment, alignmentReducer, alignmentReady, ALIGNMENT_STORAGE_KEY, type AlignmentAction } from '@/lib/alignment';
import { ObservingRig } from '@/components/observing-art';
import { createSetup, restoreSetup, setupReducer, setupReady, SETUP_STORAGE_KEY, PARTS, type SetupAction } from '@/lib/observing-setup';
import { createTube, restoreTube, tubeReducer, tubeReadiness, TUBE_STORAGE_KEY, type TubeAction } from '@/lib/tube';
import { createCounterweight, restoreCounterweight, counterweightReducer, counterweightReadiness, COUNTERWEIGHT_STORAGE_KEY, type CounterweightAction } from '@/lib/counterweight';
import { createMount, restoreMount, mountReducer, mountReadiness, MOUNT_STORAGE_KEY, type MountAction } from '@/lib/mount';
import { createTripod, restoreTripod, tripodReducer, tripodReadiness, TRIPOD_STORAGE_KEY, type TripodAction } from '@/lib/tripod';

const stages = [
  '삼각대',
  '가대',
  '무게추',
  '경통',
  '부속품·축 균형',
  '파인더 정렬',
  '초점',
];
const info = [
  {
    title: '삼각대 설치와 수평',
    desc: '준비물대에서 삼각대를 가져와 설치하고, 위에서 수준기를 보며 수평을 맞추세요.',
    tip: '삼각대의 한쪽 다리가 북쪽을 향하면 이후 극축 정렬이 더 안정적이에요.',
  },
  {
    title: '적도의식 가대 설치',
    desc: '방위 표시 N이 북쪽을 향하는지 확인한 후 가대를 삼각대 위에 결합하세요.',
    tip: '가대는 지구 자전축과 같은 방향으로 움직여 별을 부드럽게 추적하게 해요.',
  },
  {
    title: '무게추 설치하기',
    desc: '안전 나사를 확인하고 무게추를 봉에 끼운 뒤 임시 위치에 놓으세요.',
    tip: '경통을 달기 전에 무게추를 먼저 설치해야 갑작스러운 회전과 낙하를 막을 수 있어요.',
  },
  {
    title: '경통 고정하기',
    desc: '도브테일 레일을 안장 홈에 끝까지 넣고 잠금 손잡이를 조이세요.',
    tip: '경통을 한 손으로 계속 받친 채 잠금 손잡이가 단단한지 확인하세요.',
  },
  {
    title: '적경·적위 축 균형 맞추기',
    desc: '각 축의 클러치를 풀고 무게추와 경통 위치를 조절한 뒤 다시 잠그세요.',
    tip: '손을 놓아도 어느 방향으로도 저절로 돌아가지 않아야 정확한 균형 상태예요.',
  },
  {
    title: '파인더 정렬하기',
    desc: '파인더의 십자선을 주경 화면의 밝은 별과 정확히 겹치게 하세요.',
    tip: '밤에는 밝고 찾기 쉬운 별을 기준으로 주경과 파인더가 같은 방향을 보게 맞추세요.',
  },
  {
    title: '목성에 초점 맞추기',
    desc: '초점 손잡이를 천천히 돌려 목성의 가장자리가 가장 또렷해지는 지점을 찾으세요.',
    tip: '초점 지점을 지나쳤다면 반대 방향으로 아주 조금씩 되돌리세요.',
  },
];

type TripodPhase = 'shelf' | 'placed' | 'spread' | 'level';
type MountPhase = 'rack' | 'snapped' | 'secured';
type CounterPhase = 'rack' | 'installed' | 'secured';
type TubePhase = 'rack' | 'snapped' | 'locked';
type AxisPhase =
  | 'ra-locked'
  | 'ra-free'
  | 'dec-locked'
  | 'dec-free'
  | 'complete';
type FinderPhase = 'rack' | 'snapped' | 'locked' | 'aligning' | 'complete';
type ObservationPhase =
  | 'diagonal-rack'
  | 'diagonal-snapped'
  | 'diagonal-locked'
  | 'eyepiece-rack'
  | 'eyepiece-snapped'
  | 'eyepiece-locked'
  | 'focusing'
  | 'complete';
const initial = [28, 0, 78, 0, 27, 72, 22, 76, 18, 72, 0];

export default function Home() {
  const [tripodLesson, setTripodLesson] = useState(createTripod);
  const [mountLesson, setMountLesson] = useState(createMount);
  const [counterweightLesson, setCounterweightLesson] = useState(createCounterweight);
  const [tubeLesson, setTubeLesson] = useState(createTube);
  const [observingSetup, setObservingSetup] = useState(() => createSetup());
  const [alignment, setAlignment] = useState(createAlignment);
  const [focus, setFocus] = useState(createFocus);
  const [legacyProgressAvailable, setLegacyProgressAvailable] = useState(false);
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState(0);
  const [values, setValues] = useState(initial);
  const [tripodPhase, setTripodPhase] = useState<TripodPhase>('shelf');
  const [tripodPos, setTripodPos] = useState({ x: 28, y: 170 });
  const [dragging, setDragging] = useState(false);
  const [dropHint, setDropHint] = useState(false);
  const [mountPhase, setMountPhase] = useState<MountPhase>('rack');
  const [mountPos, setMountPos] = useState({ x: 38, y: 150 });
  const [mountDragging, setMountDragging] = useState(false);
  const [mountDropHint, setMountDropHint] = useState(false);
  const [counterPhase, setCounterPhase] = useState<CounterPhase>('rack');
  const [counterPos, setCounterPos] = useState({ x: 44, y: 170 });
  const [counterDragging, setCounterDragging] = useState(false);
  const [counterDropHint, setCounterDropHint] = useState(false);
  const [tubePhase, setTubePhase] = useState<TubePhase>('rack');
  const [tubePos, setTubePos] = useState({ x: 42, y: 165 });
  const [tubeDragging, setTubeDragging] = useState(false);
  const [tubeDropHint, setTubeDropHint] = useState(false);
  const [axisPhase, setAxisPhase] = useState<AxisPhase>('ra-locked');
  const [finderPhase, setFinderPhase] = useState<FinderPhase>('rack');
  const [finderPos, setFinderPos] = useState({ x: 42, y: 160 });
  const [finderDragging, setFinderDragging] = useState(false);
  const [finderDropHint, setFinderDropHint] = useState(false);
  const [observationPhase, setObservationPhase] =
    useState<ObservationPhase>('diagonal-rack');
  const [observationPos, setObservationPos] = useState({ x: 42, y: 160 });
  const [observationDragging, setObservationDragging] = useState(false);
  const [observationDropHint, setObservationDropHint] = useState(false);
  const complete = focusReady(focus);
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  const setValue = (index: number, value: number) =>
    setValues((v) => v.map((n, i) => (i === index ? value : n)));

  useEffect(() => {
    if (started) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [stage, started]);

  useEffect(() => {
    try {
      const focusSave = localStorage.getItem(FOCUS_STORAGE_KEY);
      const alignmentSave = focusSave ?? localStorage.getItem(ALIGNMENT_STORAGE_KEY);
      const currentSave = alignmentSave ?? localStorage.getItem(SETUP_STORAGE_KEY);
      const tubeSave = localStorage.getItem(TUBE_STORAGE_KEY);
      const counterSave = localStorage.getItem(COUNTERWEIGHT_STORAGE_KEY);
      const mountSave = localStorage.getItem(MOUNT_STORAGE_KEY);
      const saved = currentSave ?? tubeSave ?? counterSave ?? mountSave ?? localStorage.getItem(TRIPOD_STORAGE_KEY);
      setLegacyProgressAvailable(!focusSave && (!!saved || !!localStorage.getItem('telescope-lab-progress')));
      if (saved) {
        const data = JSON.parse(saved);
        const restored = restoreTripod(data.tripodLesson);
        setTripodLesson(restored);
        if (!tripodReadiness(restored).ready) {
          setStage(0);
          setHasLoadedProgress(true);
          return;
        }
        const savedStage = Number.isInteger(data.stage) ? Math.max(0, Math.min(data.stage, 6)) : 0;
        const restoredMount = restoreMount(currentSave || tubeSave || counterSave || mountSave ? data.mountLesson : null, restored);
        setMountLesson(restoredMount);
        setMountPhase(restoredMount.placed ? (restoredMount.fixationChecked ? 'secured' : 'snapped') : 'rack');
        if (!mountReadiness(restoredMount, restored).ready) {
          setStage(Math.min(savedStage, 1));
          setTripodPhase('level');
          setHasLoadedProgress(true);
          return;
        }
        const restoredCounter = restoreCounterweight(currentSave || tubeSave || counterSave ? data.counterweightLesson : null, restoredMount, restored);
        if (!currentSave && restoredCounter.checked) restoredCounter.feedback = '이전 실습의 무게추 고정을 이어받았습니다. 관측 부속품과 균형은 새 실습에서 확인합니다.';
        setCounterweightLesson(restoredCounter);
        setCounterPhase(restoredCounter.placed ? (restoredCounter.checked ? 'secured' : 'installed') : 'rack');
        if (!counterweightReadiness(restoredCounter, restoredMount, restored).ready) {
          setStage(Math.min(savedStage, 2));
          setTripodPhase('level');
          setHasLoadedProgress(true);
          return;
        }
        const restoredTube = restoreTube(currentSave || tubeSave ? data.tubeLesson : null, restoredCounter, restoredMount, restored);
        setTubeLesson(restoredTube);
        setTubePhase(restoredTube.placed ? (restoredTube.checked ? 'locked' : 'snapped') : 'rack');
        if (!tubeReadiness(restoredTube, restoredCounter, restoredMount, restored).ready) {
          setStage(Math.min(savedStage, 3));
          setTripodPhase('level');
          setHasLoadedProgress(true);
          return;
        }
        const restoredSetup = restoreSetup(currentSave ? data.observingSetup : null, restoredCounter.position, true);
        setObservingSetup(restoredSetup);
        if (!setupReady(restoredSetup)) {
          setStage(Math.min(savedStage, 4));
          setTripodPhase('level');
          setHasLoadedProgress(true);
          return;
        }
        const restoredAlignment = restoreAlignment(alignmentSave ? data.alignment : null, true);
        setAlignment(restoredAlignment);
        const restoredFocus = restoreFocus(focusSave ? data.focus : null, alignmentReady(restoredAlignment));
        setFocus(restoredFocus);
        setStage(alignmentReady(restoredAlignment) ? savedStage : Math.min(savedStage,5));
        setValues(
          initial.map((n, i) =>
            i === 8 && !alignmentReady(restoredAlignment) ? n : typeof data.values?.[i] === 'number' && Number.isFinite(data.values[i]) ? data.values[i] : n,
          ),
        );
        setTripodPhase(
          data.tripodPhase ?? ((data.stage ?? 0) > 0 ? 'level' : 'shelf'),
        );
        setAxisPhase('complete');
        setFinderPhase(
          alignmentReady(restoredAlignment) ? 'complete' : restoredAlignment.inspected || savedStage>=5 || ['aligning','complete'].includes(data.finderPhase) ? 'aligning' : 'rack',
        );
        setObservationPhase(focusReady(restoredFocus) ? 'complete' : restoredFocus.opened ? 'focusing' : 'eyepiece-locked');
      }
    } catch {}
    setHasLoadedProgress(true);
  }, []);
  useEffect(() => {
    if (!hasLoadedProgress) return;
    try { localStorage.setItem(
      FOCUS_STORAGE_KEY,
      JSON.stringify({
        tripodLesson,
        mountLesson,
        counterweightLesson,
        tubeLesson,
        observingSetup,
        alignment,
        focus,
        stage,
        values,
        tripodPhase,
        mountPhase,
        counterPhase,
        tubePhase,
        axisPhase,
        finderPhase,
        observationPhase,
        complete,
      }),
    ); } catch { /* The lesson still works when browser storage is unavailable. */ }
  }, [
    tripodLesson,
    mountLesson,
    counterweightLesson,
    tubeLesson,
    observingSetup,
    alignment,
    focus,
    hasLoadedProgress,
    stage,
    values,
    tripodPhase,
    mountPhase,
    counterPhase,
    tubePhase,
    axisPhase,
    finderPhase,
    observationPhase,
    complete,
  ]);
  const changeObservationPhase = (phase: ObservationPhase) => {
    setObservationPhase(phase);
    if (phase === 'diagonal-rack' || phase === 'eyepiece-rack') {
      setObservationPos({ x: 42, y: 160 });
      setObservationDragging(false);
      setObservationDropHint(false);
    }
  };

  const levelPassed =
    Math.abs(values[0] - 50) < 4 && Math.abs(values[9] - 50) < 4;
  const passed = useMemo(
    () =>
      [
        tripodPhase === 'level' && levelPassed,
        mountPhase === 'secured',
        counterweightReadiness(counterweightLesson, mountLesson, tripodLesson).ready,
        tubeReadiness(tubeLesson, counterweightLesson, mountLesson, tripodLesson).ready,
        setupReady(observingSetup),
        alignmentReady(alignment),
        alignmentReady(alignment) && focusReady(focus),
      ][stage],
    [
      stage,
      values,
      tripodPhase,
      mountPhase,
      counterPhase,
      counterweightLesson,
      mountLesson,
      tripodLesson,
      tubePhase,
      tubeLesson,
      observingSetup,
      alignment,
      focus,
      axisPhase,
      finderPhase,
      observationPhase,
      levelPassed,
    ],
  );

  const reset = () => {
    setTripodLesson(createTripod());
    setMountLesson(createMount());
    setCounterweightLesson(createCounterweight());
    setTubeLesson(createTube());
    setObservingSetup(createSetup());
    setAlignment(createAlignment());
    setFocus(createFocus());
    setStage(0);
    setValues(initial);
    setTripodPhase('shelf');
    setTripodPos({ x: 28, y: 170 });
    setMountPhase('rack');
    setMountPos({ x: 38, y: 150 });
    setCounterPhase('rack');
    setCounterPos({ x: 44, y: 170 });
    setTubePhase('rack');
    setTubePos({ x: 42, y: 165 });
    setAxisPhase('ra-locked');
    setFinderPhase('rack');
    setFinderPos({ x: 42, y: 160 });
    setObservationPhase('diagonal-rack');
    setObservationPos({ x: 42, y: 160 });
    try { localStorage.removeItem(FOCUS_STORAGE_KEY); } catch {}
  };
  const actOnTripod = (action: TripodAction) => {
    const payloadMounted = mountLesson.placed || counterPhase !== 'rack' || tubePhase !== 'rack';
    setTripodLesson(current => tripodReducer(current, payloadMounted && !['view', 'select', 'hint', 'check'].includes(action.type) ? { type: 'mounted-guard' } : action));
  };
  const actOnMount = (action: MountAction) => {
    const result = mountReducer(mountLesson, action, tripodLesson, counterPhase !== 'rack' || tubePhase !== 'rack');
    setMountLesson(result);
    setMountPhase(result.placed ? (result.fixationChecked ? 'secured' : 'snapped') : 'rack');
  };
  const actOnCounterweight = (action: CounterweightAction) => {
    const result = counterweightReducer(counterweightLesson, action, mountLesson, tripodLesson, tubePhase !== 'rack');
    setCounterweightLesson(result);
    setCounterPhase(result.placed ? (result.checked ? 'secured' : 'installed') : 'rack');
  };
  const laterTubeWork = PARTS.some(p => observingSetup.parts[p] !== 'rack') || axisPhase !== 'ra-locked' || finderPhase !== 'rack' || observationPhase !== 'diagonal-rack';
  const actOnSetup = (action: SetupAction) => {
    setObservingSetup(current => setupReducer(current, action, tubeReadiness(tubeLesson, counterweightLesson, mountLesson, tripodLesson).ready, finderPhase !== 'rack'));
  };
  const actOnAlignment = (action: AlignmentAction) => {
    const result = alignmentReducer(alignment, action, setupReady(observingSetup), focus.opened);
    setAlignment(result);
    setFinderPhase(alignmentReady(result) ? 'complete' : 'aligning');
  };
  const actOnFocus = (action: FocusAction) => {
    setFocus(current => {
      return focusReducer(current, action, setupReady(observingSetup) && alignmentReady(alignment));
    });
  };
  const actOnTube = (action: TubeAction) => {
    const result = tubeReducer(tubeLesson, action, counterweightLesson, mountLesson, tripodLesson, laterTubeWork);
    setTubeLesson(result);
    setTubePhase(result.placed ? (result.checked ? 'locked' : 'snapped') : 'rack');
  };
  const next = () => { if(stage < 6) setStage((s) => s + 1); };
  const phaseCopy =
    tripodPhase === 'shelf'
      ? {
          title: '삼각대 가져오기',
          desc: '준비물대의 접힌 삼각대를 잡아 빛나는 설치 원 안으로 드래그하세요.',
        }
      : tripodPhase === 'placed'
        ? {
            title: '삼각대 다리 펼치기',
            desc: '설치 위치가 맞습니다. 이제 세 개의 다리를 끝까지 펼쳐 지면에 안정적으로 세우세요.',
          }
        : tripodPhase === 'spread'
          ? {
              title: '수준기 확인하기',
              desc: '삼각대가 안정적으로 섰습니다. 삼각대 위에서 원형 기포 수준기를 들여다보세요.',
            }
          : {
              title: '위에서 보며 수평 맞추기',
              desc: '상부 수준기의 기포가 중앙 원 안으로 들어오도록 동쪽·남쪽 다리 높이를 조절하세요.',
            };
  const observationCopy =
    observationPhase === 'diagonal-rack'
      ? {
          title: '천정미러 가져오기',
          desc: '준비물대의 90° 천정미러를 경통 뒤 포커서 결합부로 드래그하세요.',
        }
      : observationPhase === 'diagonal-snapped'
        ? {
            title: '천정미러 고정하기',
            desc: '천정미러가 끝까지 들어갔습니다. 측면 고정 나사를 조여 회전하지 않게 하세요.',
          }
        : observationPhase === 'diagonal-locked'
          ? {
              title: '천정미러 설치 완료',
              desc: '빛의 경로가 위쪽으로 꺾였습니다. 이제 저배율 25mm 접안렌즈를 준비하세요.',
            }
          : observationPhase === 'eyepiece-rack'
            ? {
                title: '25mm 접안렌즈 설치',
                desc: '접안렌즈의 은색 배럴을 천정미러 위 소켓으로 드래그해 끝까지 끼우세요.',
              }
            : observationPhase === 'eyepiece-snapped'
              ? {
                  title: '접안렌즈 고정하기',
                  desc: '접안렌즈를 한 손으로 받친 채 작은 고정 나사를 조이세요.',
                }
              : observationPhase === 'eyepiece-locked'
                ? {
                    title: '관측 자세 준비',
                    desc: '광학 부품이 모두 고정되었습니다. 접안부 시야를 열고 목성을 확인하세요.',
                  }
                  : {
                      title: '목성에 초점 맞추기',
                      desc: '초점 손잡이를 천천히 돌려 목성의 띠와 가장자리가 가장 또렷한 지점을 찾으세요.',
                    };

  const pointerInsideTarget = (
    e: React.PointerEvent<HTMLDivElement>,
    selector: string,
    padding = 16,
  ) => {
    const target = e.currentTarget.parentElement
      ?.querySelector<HTMLElement>(selector)
      ?.getBoundingClientRect();
    if (!target) return false;
    return (
      e.clientX >= target.left - padding &&
      e.clientX <= target.right + padding &&
      e.clientY >= target.top - padding &&
      e.clientY <= target.bottom + padding
    );
  };

  const dragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    const x = e.clientX - bench.left - 58,
      y = e.clientY - bench.top - 95;
    setTripodPos({ x, y });
    setDropHint(pointerInsideTarget(e, '.drop-zone', 28));
  };
  const dragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    if (dropHint) {
      setTripodPhase('placed');
      setTripodPos({ x: 0, y: 0 });
    } else setTripodPos({ x: 28, y: 170 });
    setDropHint(false);
  };
  const mountDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountDragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    setMountPos({
      x: e.clientX - bench.left - 72,
      y: e.clientY - bench.top - 90,
    });
    setMountDropHint(pointerInsideTarget(e, '.mount-drop-target', 22));
  };
  const mountDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mountDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setMountDragging(false);
    if (mountDropHint) {
      setMountPhase('snapped');
      setMountPos({ x: 0, y: 0 });
    } else setMountPos({ x: 38, y: 150 });
    setMountDropHint(false);
  };
  const counterDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!counterDragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    setCounterPos({
      x: e.clientX - bench.left - 52,
      y: e.clientY - bench.top - 70,
    });
    setCounterDropHint(pointerInsideTarget(e, '.counter-drop-target', 20));
  };
  const counterDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!counterDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setCounterDragging(false);
    if (counterDropHint) {
      setCounterPhase('installed');
      setCounterPos({ x: 0, y: 0 });
    } else setCounterPos({ x: 44, y: 170 });
    setCounterDropHint(false);
  };
  const tubeDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tubeDragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    setTubePos({
      x: e.clientX - bench.left - 90,
      y: e.clientY - bench.top - 55,
    });
    setTubeDropHint(pointerInsideTarget(e, '.tube-drop-target', 22));
  };
  const tubeDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tubeDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setTubeDragging(false);
    if (tubeDropHint) {
      setTubePhase('snapped');
      setTubePos({ x: 0, y: 0 });
    } else setTubePos({ x: 42, y: 165 });
    setTubeDropHint(false);
  };
  const finderDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!finderDragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    setFinderPos({
      x: e.clientX - bench.left - 72,
      y: e.clientY - bench.top - 48,
    });
    setFinderDropHint(pointerInsideTarget(e, '.finder-drop-target', 18));
  };
  const finderDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!finderDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setFinderDragging(false);
    if (finderDropHint) {
      setFinderPhase('snapped');
      setFinderPos({ x: 0, y: 0 });
    } else setFinderPos({ x: 42, y: 160 });
    setFinderDropHint(false);
  };
  const observationDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!observationDragging) return;
    const bench = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!bench) return;
    const isEyepiece = observationPhase === 'eyepiece-rack';
    setObservationPos({
      x: e.clientX - bench.left - (isEyepiece ? 44 : 70),
      y: e.clientY - bench.top - (isEyepiece ? 70 : 54),
    });
    setObservationDropHint(
      pointerInsideTarget(e, '.observation-drop-target', isEyepiece ? 16 : 20),
    );
  };
  const observationDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!observationDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setObservationDragging(false);
    if (observationDropHint) {
      setObservationPhase(
        observationPhase === 'diagonal-rack'
          ? 'diagonal-snapped'
          : 'eyepiece-snapped',
      );
      setObservationPos({ x: 0, y: 0 });
    } else setObservationPos({ x: 42, y: 160 });
    setObservationDropHint(false);
  };

  if (!started)
    return (
      <main className="sim-shell intro equipment-intro">
        <section className="intro-card glass">
          <div className="eyebrow">
            <Sparkles size={14} /> ASTRONOMY FIELD LAB · MISSION 01
          </div>
          <h1>
            오늘 밤, 직접
            <br />
            <em>망원경을 세워보세요.</em>
          </h1>
          <p>
            준비물대에서 장비를 꺼내고 수평과 균형을 맞춰, 첫 천체 관측까지
            기본 조작을 연습하는 교육용 시뮬레이션입니다.
          </p>
          <div className="mission-meta">
            <span>예상 12분</span>
            <span>중학교 영재 수업</span>
            <span>직접 조작</span>
          </div>
          <MissionBrief />
          {legacyProgressAvailable && <p>7단계가 상의 변화를 관찰하며 초점을 찾는 실습으로 바뀌었습니다. 이전 기록은 별도로 보관하며 유효한 1~6단계 기록을 이어받습니다. 예전 초점 완료는 새 관측 완료로 처리하지 않습니다.</p>}
          <Button className="launch" onClick={() => setStarted(true)}>
            관측 임무 시작 <ChevronRight />
          </Button>
        </section>
        <div className="intro-mark">
          TELESCOPE
          <br />
          SETUP LAB
        </div>
      </main>
    );

  return (
    <main className="sim-shell tripod-mode">
      <header className="topbar glass">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <div>
            <b>TELESCOPE LAB</b>
            <small>FIELD TRAINING 01</small>
          </div>
        </div>
        <div className="progress-wrap">
          <span>설치 진행도</span>
          <b>{complete ? 100 : Math.round((stage / 7) * 100)}%</b>
          <div className="progress">
            <i style={{ width: `${complete ? 100 : (stage / 7) * 100}%` }} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="처음부터"
          onClick={reset}
        >
          <RotateCcw />
        </Button>
      </header>

      <aside className="steps glass" aria-label="설치 단계">
        <p className="panel-label">ASSEMBLY SEQUENCE</p>
        {stages.map((name, i) => (
          <button
            key={name}
            className={`${i === stage ? 'active' : ''} ${i < stage || complete ? 'done' : ''}`}
            disabled={i > stage}
            onClick={() => i < stage && setStage(i)}
          >
            <span>{i < stage || complete ? <Check /> : i + 1}</span>
            <div>
              <small>STEP {String(i + 1).padStart(2, '0')}</small>
              <b>{name}</b>
            </div>
          </button>
        ))}
      </aside>

      {stage === 0 ? <TripodLesson state={tripodLesson} payloadAttached={mountLesson.placed} onAction={actOnTripod} onAdvance={() => {
        if (!tripodReadiness(tripodLesson).ready) return;
        setTripodPhase('level');
        setStage(1);
      }} /> : stage === 1 ? <MountLesson state={mountLesson} tripod={tripodLesson} onAction={actOnMount} onBack={() => setStage(0)} onAdvance={() => {
        if (!mountReadiness(mountLesson, tripodLesson).ready) return;
        setMountPhase('secured');
        setStage(2);
      }} /> : stage === 2 ? <CounterweightLesson state={counterweightLesson} tripod={tripodLesson} mount={mountLesson} tubeAttached={tubeLesson.placed} tube={tubeLesson} observing={observingSetup.events.length ? observingSetup : undefined} onAction={actOnCounterweight} onBack={() => setStage(1)} onAdvance={() => {
        if (!counterweightReadiness(counterweightLesson, mountLesson, tripodLesson).ready) return;
        setCounterPhase('secured');
        setStage(3);
      }} /> : stage === 3 ? <TubeLesson state={tubeLesson} counter={counterweightLesson} mount={mountLesson} tripod={tripodLesson} observing={observingSetup.events.length ? observingSetup : undefined} laterWork={laterTubeWork} onAction={actOnTube} onBack={() => setStage(2)} onAdvance={() => {
        if (!tubeReadiness(tubeLesson, counterweightLesson, mountLesson, tripodLesson).ready) return;
        setTubePhase('locked');
        setValue(3, 1);
        if (!observingSetup.events.length) setObservingSetup(createSetup(counterweightLesson.position));
        setStage(4);
      }} /> : stage === 4 ? <ObservingLesson state={observingSetup} tripod={tripodLesson} readOnly={finderPhase !== 'rack'} prerequisite={tubeReadiness(tubeLesson,counterweightLesson,mountLesson,tripodLesson).ready} onAction={actOnSetup} onBack={() => setStage(3)} onAdvance={() => {
        if (!setupReady(observingSetup)) return;
        setAxisPhase('complete');
        if (finderPhase === 'rack') setFinderPhase('aligning');
        if (observationPhase === 'diagonal-rack') setObservationPhase('eyepiece-locked');
        setStage(5);
      }} /> : stage === 5 ? <AlignmentLesson state={alignment} setup={observingSetup} tripod={tripodLesson} readOnly={focus.opened} onAction={actOnAlignment} onBack={()=>setStage(4)} onAdvance={()=>{
        if(!alignmentReady(alignment))return;
        setFinderPhase('complete');
        setStage(6);
      }}/> : stage === 6 ? <FocusLesson state={focus} alignment={alignment} setup={observingSetup} tripod={tripodLesson} onAction={actOnFocus} onBack={()=>setStage(5)} onReset={reset}/> : <>
      <section
        className={`workbench ${stage === 0 && tripodPhase === 'level' ? 'level-camera' : ''}`}
      >
        <div className="scene-status">
          <span>
            <Compass /> 방위 000° N
          </span>
          <span>
            <CircleGauge /> 단계 {stage + 1}/7
          </span>
          {stage === 0 && (
            <span className="camera-chip">
              {tripodPhase === 'level' ? (
                <>
                  <Eye /> TOP VIEW
                </>
              ) : (
                <>
                  <Move /> FIELD VIEW
                </>
              )}
            </span>
          )}
        </div>
        {stage === 0 && <EquipmentRack empty={tripodPhase !== 'shelf'} />}
        {stage === 1 && <MountRack empty={mountPhase !== 'rack'} />}
        {stage === 2 && <CounterweightRack empty={counterPhase !== 'rack'} />}
        {stage === 3 && <TubeRack empty={tubePhase !== 'rack'} />}
        {stage === 0 && tripodPhase === 'shelf' && (
          <div
            role="button"
            tabIndex={0}
            aria-label="접힌 삼각대. 설치 위치로 드래그하세요"
            className={`draggable-tripod part-card ${dragging ? 'dragging' : ''}`}
            style={{ left: tripodPos.x, top: tripodPos.y }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
            }}
            onPointerMove={dragMove}
            onPointerUp={dragEnd}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTripodPhase('placed');
                setTripodPos({ x: 0, y: 0 });
              }
            }}
          >
            <Grip />
            <FoldedTripod />
            <span>잡아서 드래그</span>
          </div>
        )}
        {stage === 0 && tripodPhase !== 'shelf' && tripodPhase !== 'level' && (
          <TripodModel folded={tripodPhase === 'placed'} tiltX={0} tiltY={0} />
        )}
        {stage >= 5 ? <div className="telescope-pro cohesive-rig"><ObservingRig state={observingSetup} tripod={tripodLesson}/></div> : stage > 0 && (
          <TelescopeModel
            stage={stage}
            counter={values[2]}
            mountVisible={stage > 1 || mountPhase !== 'rack'}
            counterVisible={stage > 2 || counterPhase !== 'rack'}
            tubePhase={tubePhase}
            axisPhase={axisPhase}
            finderPhase={finderPhase}
            observationPhase={observationPhase}
          />
        )}
        {stage > 0 && (
          <div className={`rig-anchor-layer stage-${stage + 1}`}>
            {stage === 1 && mountPhase === 'rack' && (
              <div
                className={`mount-drop-target ${mountDropHint ? 'ready' : ''}`}
              >
                <i />
                <span>삼각대 상판</span>
              </div>
            )}
            {stage === 1 && mountPhase !== 'rack' && (
              <>
                <div className="mount-seat-highlight" />
                <button
                  className={`scene-screw underside ${values[1] >= 85 ? 'tight' : ''}`}
                  onClick={() => setValue(1, Math.min(100, values[1] + 20))}
                  aria-label="삼각대 아래 중앙 고정나사 조이기"
                  style={{ rotate: `${values[1] * 3.2}deg` }}
                >
                  <RotateCw />
                </button>
                <button
                  className={`scene-screw side ${values[10] >= 85 ? 'tight' : ''}`}
                  onClick={() => setValue(10, Math.min(100, values[10] + 20))}
                  aria-label="가대 측면 방위 잠금나사 조이기"
                  style={{ rotate: `${values[10] * 3.2}deg` }}
                >
                  <RotateCw />
                </button>
                <div className="mount-lock-status">
                  <span className={values[1] >= 85 ? 'done' : ''}>하부 고정</span>
                  <span className={values[10] >= 85 ? 'done' : ''}>측면 잠금</span>
                </div>
              </>
            )}
            {stage === 2 && counterPhase === 'rack' && (
              <div
                className={`counter-drop-target ${counterDropHint ? 'ready' : ''}`}
              >
                <i />
                <span>무게추 봉 끝</span>
              </div>
            )}
            {stage === 3 && tubePhase === 'rack' && (
              <div className={`tube-drop-target ${tubeDropHint ? 'ready' : ''}`}>
                <i />
                <span>도브테일 안장</span>
              </div>
            )}
            {stage === 3 && tubePhase === 'snapped' && (
              <div className="tube-clamp-highlight" />
            )}
            {stage === 4 && (
              <AxisDragSurface
                phase={axisPhase}
                value={axisPhase === 'ra-free' ? values[4] : values[5]}
                setValue={setValue}
              />
            )}
            {stage === 5 && finderPhase === 'rack' && (
              <div
                className={`finder-drop-target ${finderDropHint ? 'ready' : ''}`}
              >
                <i />
                <span>파인더 슈</span>
              </div>
            )}
            {stage === 5 && finderPhase === 'snapped' && (
              <div className="finder-lock-highlight">
                <RotateCw />
              </div>
            )}
            {stage === 6 &&
              (observationPhase === 'diagonal-rack' ||
                observationPhase === 'eyepiece-rack') && (
                <div
                  className={`observation-drop-target ${observationPhase === 'eyepiece-rack' ? 'eyepiece-target' : ''} ${observationDropHint ? 'ready' : ''}`}
                >
                  <i />
                  <span>
                    {observationPhase === 'diagonal-rack'
                      ? '포커서 결합부'
                      : '접안렌즈 소켓'}
                  </span>
                </div>
              )}
            {stage === 6 &&
              (observationPhase === 'diagonal-snapped' ||
                observationPhase === 'eyepiece-snapped') && (
                <div
                  className={`observation-lock-highlight ${observationPhase.startsWith('eyepiece') ? 'eyepiece-lock' : ''}`}
                >
                  <RotateCw />
                </div>
              )}
          </div>
        )}
        {stage === 4 && (
          <>
            <AxisBalanceHUD phase={axisPhase} ra={values[4]} dec={values[5]} />
            <AxisBalanceControls
              phase={axisPhase}
              setPhase={setAxisPhase}
              values={values}
              setValue={setValue}
            />
          </>
        )}
        {stage === 0 && tripodPhase === 'shelf' && (
          <div className={`drop-zone ${dropHint ? 'ready' : ''}`}>
            <div className="drop-rings" />
            <b>{dropHint ? '여기에 놓으세요' : '삼각대 설치 위치'}</b>
            <small>NORTH LEG</small>
          </div>
        )}
        {stage === 1 && mountPhase === 'rack' && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="적도의식 가대. 삼각대 상판으로 드래그하세요"
              className={`draggable-mount part-card ${mountDragging ? 'dragging' : ''}`}
              style={{ left: mountPos.x, top: mountPos.y }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setMountDragging(true);
              }}
              onPointerMove={mountDragMove}
              onPointerUp={mountDragEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setMountPhase('snapped');
                  setMountPos({ x: 0, y: 0 });
                }
              }}
            >
              <Grip />
              <img
                src="/equatorial-mount-stylized-v3.png"
                alt="캐릭터 스타일 적도의식 가대"
              />
              <span>잡아서 드래그</span>
            </div>
          </>
        )}
        {stage === 2 && counterPhase === 'rack' && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="무게추. 가대의 무게추 봉으로 드래그하세요"
              className={`draggable-counter part-card ${counterDragging ? 'dragging' : ''}`}
              style={{ left: counterPos.x, top: counterPos.y }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setCounterDragging(true);
              }}
              onPointerMove={counterDragMove}
              onPointerUp={counterDragEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCounterPhase('installed');
                  setCounterPos({ x: 0, y: 0 });
                }
              }}
            >
              <Grip />
              <CounterweightPiece />
              <span>잡아서 드래그</span>
            </div>
          </>
        )}
        {stage === 3 && tubePhase === 'rack' && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="경통. 가대 안장으로 드래그하세요"
              className={`draggable-tube part-card ${tubeDragging ? 'dragging' : ''}`}
              style={{ left: tubePos.x, top: tubePos.y }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setTubeDragging(true);
              }}
              onPointerMove={tubeDragMove}
              onPointerUp={tubeDragEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTubePhase('snapped');
                  setTubePos({ x: 0, y: 0 });
                }
              }}
            >
              <Grip />
              <TubePiece />
              <span>양손으로 잡고 드래그</span>
            </div>
          </>
        )}
        {stage === 5 && finderPhase === 'rack' && (
          <>
            <div
              role="button"
              tabIndex={0}
              aria-label="파인더. 경통 위 파인더 슈로 드래그하세요"
              className={`draggable-finder part-card ${finderDragging ? 'dragging' : ''}`}
              style={{ left: finderPos.x, top: finderPos.y }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setFinderDragging(true);
              }}
              onPointerMove={finderDragMove}
              onPointerUp={finderDragEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFinderPhase('snapped');
                  setFinderPos({ x: 0, y: 0 });
                }
              }}
            >
              <Grip />
              <img
                src="/finder-scope-stylized-v1.png"
                alt="소형 굴절망원경 파인더"
              />
              <span>잡아서 드래그</span>
            </div>
          </>
        )}
        {stage === 5 && (
          <FinderStageControls
            phase={finderPhase}
            setPhase={setFinderPhase}
            values={values}
            setValue={setValue}
          />
        )}
        {stage === 6 &&
          (observationPhase === 'diagonal-rack' ||
            observationPhase === 'eyepiece-rack') && (
            <>
              <div
                role="button"
                tabIndex={0}
                aria-label={
                  observationPhase === 'diagonal-rack'
                    ? '천정미러. 경통 뒤 포커서로 드래그하세요'
                    : '25밀리미터 접안렌즈. 천정미러 위 소켓으로 드래그하세요'
                }
                className={`draggable-observation part-card ${observationPhase === 'eyepiece-rack' ? 'eyepiece-part' : 'diagonal-part'} ${observationDragging ? 'dragging' : ''}`}
                style={{ left: observationPos.x, top: observationPos.y }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setObservationDragging(true);
                }}
                onPointerMove={observationDragMove}
                onPointerUp={observationDragEnd}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    changeObservationPhase(
                      observationPhase === 'diagonal-rack'
                        ? 'diagonal-snapped'
                        : 'eyepiece-snapped',
                    );
                    setObservationPos({ x: 0, y: 0 });
                  }
                }}
              >
                <Grip />
                <img
                  src={
                    observationPhase === 'diagonal-rack'
                      ? '/star-diagonal-stylized-v1.png'
                      : '/eyepiece-25mm-stylized-v1.png'
                  }
                  alt={
                    observationPhase === 'diagonal-rack'
                      ? '90도 천정미러'
                      : '25밀리미터 접안렌즈'
                  }
                />
                <span>잡아서 드래그</span>
              </div>
            </>
          )}
        {stage === 6 && (
          <ObservationStageControls
            phase={observationPhase}
            setPhase={changeObservationPhase}
            focus={values[8]}
            setValue={setValue}
          />
        )}
        {stage === 0 && tripodPhase !== 'shelf' && tripodPhase !== 'level' && (
          <div className="ground-ring installed" />
        )}
        {stage === 0 && tripodPhase === 'level' && (
          <div className="top-level-inspection">
            <div className="tripod-top-plate realistic">
              <img
                src="/tripod-top-inspection-v1.png"
                alt="삼각대 상판과 원형 기포 수준기의 실제 상부 모습"
              />
              <span className="north-mark">N</span>
              <div className={`round-level ${levelPassed ? 'ok' : ''}`}>
                <div className="level-target" />
                <i style={{ left: `${values[0]}%`, top: `${values[9]}%` }} />
              </div>
            </div>
            <div className="camera-caption">
              <span>삼각대 상부 · 90°</span>
              <b>
                {levelPassed
                  ? '기포가 중앙에 들어왔습니다'
                  : '실제 수준기의 기포를 중앙 원으로 이동'}
              </b>
            </div>
          </div>
        )}
        {stage === 5 &&
          (finderPhase === 'aligning' || finderPhase === 'complete') && (
            <div className="dual-finder-view">
              <div className="scope-view">
                <b>주경 시야</b>
                <div className="target-star" />
                <i className="scope-center" />
              </div>
              <div
                className={`finder-view ${finderPhase === 'complete' ? 'aligned' : ''}`}
              >
                <b>파인더 시야</b>
                <div className="target-star" />
                <div
                  className="crosshair"
                  style={{ left: `${values[6]}%`, top: `${values[7]}%` }}
                />
              </div>
            </div>
          )}
        {stage === 6 &&
          (observationPhase === 'focusing' ||
            observationPhase === 'complete') && (
            <FocusView
              focus={values[8]}
              complete={observationPhase === 'complete'}
            />
          )}
      </section>

      <aside className="task-panel glass">
        <div className="task-no">
          STEP {String(stage + 1).padStart(2, '0')} / 07
        </div>
        <h2>
          {stage === 0
            ? phaseCopy.title
            : stage === 6
              ? observationCopy.title
              : stage === 1 && mountPhase === 'rack'
                ? '가대 가져오기'
                : stage === 2 && counterPhase === 'rack'
                  ? '무게추 가져오기'
                  : stage === 3 && tubePhase === 'rack'
                    ? '경통 가져오기'
                    : info[stage].title}
        </h2>
        <p>
          {stage === 0
            ? phaseCopy.desc
            : stage === 6
              ? observationCopy.desc
              : stage === 1 && mountPhase === 'rack'
                ? '준비물대의 적도의식 가대를 잡아 삼각대 상판의 결합 표시로 드래그하세요.'
                : stage === 1 && mountPhase === 'snapped'
                  ? '결합점에 정확히 안착했습니다. 아래 중앙 나사와 옆 잠금 나사를 순서대로 조이세요.'
                  : stage === 1
                    ? '가대가 고정되었습니다. 이제 다음 단계에서 무게추를 설치합니다.'
                    : stage === 2 && counterPhase === 'rack'
                      ? '무게추를 가대 왼쪽의 실제 무게추 봉 표시까지 드래그해 끼우세요.'
                      : stage === 2 && counterPhase === 'installed'
                        ? '무게추를 한 손으로 잡은 채 고정 손잡이와 봉 끝 안전나사를 잠그세요. 실제 균형 조절은 경통 설치 후 진행합니다.'
                        : stage === 2
                          ? '무게추가 안전하게 고정됐습니다. 현재 위치는 임시 위치이며 STEP 05에서 적경 균형을 맞춥니다.'
                          : stage === 3 && tubePhase === 'rack'
                            ? '경통을 양손으로 받쳐 가대 안장의 결합 표시까지 드래그하세요.'
                            : stage === 3 && tubePhase === 'snapped'
                              ? '도브테일 레일이 안착했습니다. 경통을 받친 채 잠금 손잡이를 조이세요.'
                              : stage === 3
                                ? '경통이 단단히 고정되었습니다. 이제 축 정렬을 시작합니다.'
                                : info[stage].desc}
        </p>
        <div className="tip">
          <b>관측 노트</b>
          <span>{info[stage].tip}</span>
        </div>
        <Controls
          stage={stage}
          values={values}
          setValue={setValue}
          tripodPhase={tripodPhase}
          setTripodPhase={setTripodPhase}
          mountPhase={mountPhase}
          counterPhase={counterPhase}
          setCounterPhase={setCounterPhase}
          tubePhase={tubePhase}
          setTubePhase={setTubePhase}
        />
        {stage === 6 ? (
          <ObservationSequence phase={observationPhase} />
        ) : stage === 0 ? (
          <div className="mini-sequence">
            <span className={tripodPhase !== 'shelf' ? 'done' : ''}>
              1 위치
            </span>
            <span
              className={
                tripodPhase === 'spread' || tripodPhase === 'level'
                  ? 'done'
                  : ''
              }
            >
              2 펼치기
            </span>
            <span className={tripodPhase === 'level' ? 'done' : ''}>
              3 수평
            </span>
          </div>
        ) : stage === 1 ? (
          <div className="mini-sequence">
            <span className={mountPhase !== 'rack' ? 'done' : ''}>1 안착</span>
            <span className={values[1] >= 85 ? 'done' : ''}>2 하부 나사</span>
            <span className={values[10] >= 85 ? 'done' : ''}>3 측면 나사</span>
          </div>
        ) : stage === 2 ? (
          <div className="mini-sequence">
            <span className={counterPhase !== 'rack' ? 'done' : ''}>
              1 봉에 끼우기
            </span>
            <span className={counterPhase === 'secured' ? 'done' : ''}>
              2 안전 고정
            </span>
          </div>
        ) : stage === 3 ? (
          <div className="mini-sequence">
            <span className={tubePhase !== 'rack' ? 'done' : ''}>1 안착</span>
            <span className={tubePhase === 'locked' ? 'done' : ''}>2 잠금</span>
          </div>
        ) : (
          <div className={`check-state ${passed ? 'pass' : ''}`}>
            {passed ? (
              <>
                <Check /> 조건을 만족했습니다
              </>
            ) : (
              <>● 완료 조건을 찾아보세요</>
            )}
          </div>
        )}
        <Button className="next" disabled={!passed} onClick={next}>
          {stage === 6 ? '관측 결과 확인' : '다음 단계로'} <ChevronRight />
        </Button>
      </aside>

      </>}
      <footer>
        <span>관측지 · 해발 640m</span>
        <span>맑음 · 시상 4/5</span>
        <span>진행 상황 자동 저장</span>
      </footer>
    </main>
  );
}

function RackCleared() {
  return (
    <div className="rack-cleared">
      <Check />
      <b>장착 완료</b>
      <small>작업대로 이동됨</small>
    </div>
  );
}
function EquipmentRack({ empty }: { empty: boolean }) {
  return (
    <div className="equipment-rack glass">
      <div className="rack-title">
        <span>준비물대</span>
        <small>EQUIPMENT 01</small>
      </div>
      <div className={`rack-slot tripod-slot ${empty ? 'empty' : ''}`}>
        {empty && <RackCleared />}
        <span>삼각대</span>
        <small>{empty ? '작업대에 설치 중' : 'ALUMINUM TRIPOD'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function MountRack({ empty }: { empty: boolean }) {
  return (
    <div className="equipment-rack mount-rack glass">
      <div className="rack-title">
        <span>준비물대</span>
        <small>EQUIPMENT 02</small>
      </div>
      <div className={`rack-slot mount-slot ${empty ? 'empty' : ''}`}>
        {empty && <RackCleared />}
        <span>적도의식 가대</span>
        <small>{empty ? '삼각대에 장착 중' : 'EQUATORIAL MOUNT'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function CounterweightRack({ empty }: { empty: boolean }) {
  return (
    <div className="equipment-rack counter-rack glass">
      <div className="rack-title">
        <span>준비물대</span>
        <small>EQUIPMENT 03</small>
      </div>
      <div className={`rack-slot counter-slot ${empty ? 'empty' : ''}`}>
        {empty && <RackCleared />}
        <span>무게추</span>
        <small>{empty ? '무게추 봉에 장착 중' : 'COUNTERWEIGHT'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function TubeRack({ empty }: { empty: boolean }) {
  return (
    <div className="equipment-rack tube-rack glass">
      <div className="rack-title">
        <span>준비물대</span>
        <small>EQUIPMENT 04</small>
      </div>
      <div className={`rack-slot tube-slot ${empty ? 'empty' : ''}`}>
        {empty && <RackCleared />}
        <span>경통</span>
        <small>{empty ? '가대에 장착 중' : 'OPTICAL TUBE'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function FinderRack({ empty }: { empty: boolean }) {
  return (
    <div className="equipment-rack finder-rack glass">
      <div className="rack-title">
        <span>준비물대</span>
        <small>EQUIPMENT 05</small>
      </div>
      <div className={`rack-slot finder-slot ${empty ? 'empty' : ''}`}>
        {empty && <RackCleared />}
        <span>파인더</span>
        <small>{empty ? '경통에 장착 중' : 'FINDER SCOPE'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function ObservationRack({ phase }: { phase: ObservationPhase }) {
  const eyepiece = !phase.startsWith('diagonal');
  const available = phase === 'diagonal-rack' || phase === 'eyepiece-rack';
  return (
    <div className="equipment-rack observation-rack glass">
      <div className="rack-title">
        <span>접안부 준비물</span>
        <small>EQUIPMENT 06</small>
      </div>
      <div
        className={`rack-slot observation-slot ${eyepiece ? 'eyepiece-slot' : ''} ${available ? '' : 'empty'}`}
      >
        {!available && <RackCleared />}
        <span>{eyepiece ? '25mm 접안렌즈' : '90° 천정미러'}</span>
        <small>{available ? 'LOW POWER SET' : '접안부에 장착됨'}</small>
      </div>
      <div className="rack-parts">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
function FoldedTripod() {
  return (
    <img
      className="folded-tripod-image"
      src="/tripod-folded-stylized-v1.png"
      alt="다리가 접힌 알루미늄 천체망원경 삼각대"
    />
  );
}
function CounterweightPiece() {
  return (
    <div className="counterweight-piece">
      <i />
      <b />
      <span />
    </div>
  );
}
function TubePiece() {
  return (
    <img
      className="tube-piece-image"
      src="/optical-tube-stylized-v2.png"
      alt="흰색 굴절망원경 경통과 도브테일 레일"
    />
  );
}
function TripodModel({
  folded,
  tiltX,
  tiltY,
}: {
  folded: boolean;
  tiltX: number;
  tiltY: number;
}) {
  const src = folded
    ? '/tripod-folded-stylized-v1.png'
    : '/telescope-stage-01-v4.png';
  return (
    <div
      className={`tripod-model photo-tripod ${folded ? 'folded-photo' : 'spread-photo'}`}
      style={{ rotate: `${tiltX + tiltY}deg` }}
    >
      <img
        src={src}
        alt={
          folded
            ? '설치 위치에 세워 둔 접힌 알루미늄 천체망원경 삼각대'
            : '세 다리를 펼쳐 안정적으로 세운 알루미늄 천체망원경 삼각대'
        }
      />
    </div>
  );
}
function AxisBalanceHUD({
  phase,
  ra,
  dec,
}: {
  phase: AxisPhase;
  ra: number;
  dec: number;
}) {
  const isRa = phase === 'ra-locked' || phase === 'ra-free';
  const value = isRa ? ra : dec;
  const error = Math.abs(value - 50);
  const direction = isRa
    ? value < 50
      ? '경통 쪽으로 기움'
      : '무게추 쪽으로 기움'
    : value < 50
      ? '대물렌즈 쪽으로 기움'
      : '접안부 쪽으로 기움';
  return (
    <div className="axis-balance-hud">
      <b>{isRa ? 'RA · 적경축' : 'DEC · 적위축'}</b>
      <span className={error < 6 ? 'balanced' : error < 18 ? 'near' : ''}>
        {error < 6 ? '균형 확보' : direction}
      </span>
      <div>
        <i style={{ left: `${value}%` }} />
      </div>
      <small>
        {phase === 'complete'
          ? '두 축 잠금 완료'
          : phase.endsWith('free')
            ? '클러치 해제 · 위치 조절 중'
            : '클러치 잠금 상태'}
      </small>
    </div>
  );
}
function AxisDragSurface({
  phase,
  value,
  setValue,
}: {
  phase: AxisPhase;
  value: number;
  setValue: (i: number, v: number) => void;
}) {
  const [active, setActive] = useState(false);
  if (phase !== 'ra-free' && phase !== 'dec-free') return null;
  const index = phase === 'ra-free' ? 4 : 5;
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    );
    setValue(index, Math.round(next));
  };
  return (
    <div
      role="slider"
      aria-label={
        phase === 'ra-free'
          ? '화면에서 무게추 위치 조절'
          : '화면에서 경통 앞뒤 위치 조절'
      }
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={`axis-drag-hotspot ${phase === 'ra-free' ? 'ra' : 'dec'} ${active ? 'active' : ''}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setActive(true);
      }}
      onPointerMove={move}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setActive(false);
      }}
    >
      <Move />
      <span>
        {phase === 'ra-free'
          ? '무게추를 좌우로 드래그'
          : '경통을 앞뒤로 드래그'}
      </span>
    </div>
  );
}
function AxisBalanceControls({
  phase,
  setPhase,
  values,
  setValue,
}: {
  phase: AxisPhase;
  setPhase: (p: AxisPhase) => void;
  values: number[];
  setValue: (i: number, v: number) => void;
}) {
  const raOk = Math.abs(values[4] - 50) < 6;
  const decOk = Math.abs(values[5] - 50) < 6;
  if (phase === 'ra-locked')
    return (
      <div className="axis-control-dock">
        <b>1 · 적경축 균형</b>
        <p>클러치를 풀어 무게추 봉이 자유롭게 움직이도록 하세요.</p>
        <Button onClick={() => setPhase('ra-free')}>
          <RotateCw /> 적경축 클러치 풀기
        </Button>
      </div>
    );
  if (phase === 'ra-free')
    return (
      <div className="axis-control-dock">
        <b>1 · 무게추 위치 조절</b>
        <Range
          label="무게추 이동"
          value={values[4]}
          index={4}
          setValue={setValue}
        />
        <Button disabled={!raOk} onClick={() => setPhase('dec-locked')}>
          {raOk ? <Check /> : <CircleGauge />} 적경축 다시 잠그기
        </Button>
      </div>
    );
  if (phase === 'dec-locked')
    return (
      <div className="axis-control-dock">
        <b>2 · 적위축 균형</b>
        <p>경통을 수평으로 놓고 적위축 클러치를 푸세요.</p>
        <Button onClick={() => setPhase('dec-free')}>
          <RotateCw /> 적위축 클러치 풀기
        </Button>
      </div>
    );
  if (phase === 'dec-free')
    return (
      <div className="axis-control-dock">
        <b>2 · 경통 앞뒤 위치 조절</b>
        <Range
          label="경통 앞뒤 이동"
          value={values[5]}
          index={5}
          setValue={setValue}
        />
        <Button disabled={!decOk} onClick={() => setPhase('complete')}>
          {decOk ? <Check /> : <CircleGauge />} 적위축 다시 잠그기
        </Button>
      </div>
    );
  return (
    <div className="axis-control-dock complete">
      <Check />
      <div>
        <b>두 축 균형 확보</b>
        <p>적경·적위 클러치가 모두 잠겼습니다.</p>
      </div>
    </div>
  );
}
function FinderStageControls({
  phase,
  setPhase,
  values,
  setValue,
}: {
  phase: FinderPhase;
  setPhase: (p: FinderPhase) => void;
  values: number[];
  setValue: (i: number, v: number) => void;
}) {
  const aligned = Math.abs(values[6] - 50) < 7 && Math.abs(values[7] - 50) < 7;
  if (phase === 'rack')
    return (
      <div className="finder-control-dock">
        <Move />
        <span>준비물대의 파인더를 경통 위 결합부로 이동하세요.</span>
      </div>
    );
  if (phase === 'snapped')
    return (
      <div className="finder-control-dock">
        <b>파인더 안착 완료</b>
        <p>파인더를 받친 채 고정 나사를 조이세요.</p>
        <Button onClick={() => setPhase('locked')}>
          <RotateCw /> 고정 나사 조이기
        </Button>
      </div>
    );
  if (phase === 'locked')
    return (
      <div className="finder-control-dock">
        <b>파인더 고정 완료</b>
        <p>주경의 기준 별과 파인더 십자선을 비교합니다.</p>
        <Button onClick={() => setPhase('aligning')}>
          <Eye /> 이중 시야 열기
        </Button>
      </div>
    );
  if (phase === 'aligning')
    return (
      <div className="finder-control-dock align">
        <b>{aligned ? '정렬 완료' : '조절 나사를 돌려 십자선을 이동'}</b>
        <div className="finder-screws">
          <button
            aria-label="십자선 왼쪽 이동"
            onClick={() => setValue(6, Math.max(0, values[6] - 6))}
          >
            ←
          </button>
          <button
            aria-label="십자선 오른쪽 이동"
            onClick={() => setValue(6, Math.min(100, values[6] + 6))}
          >
            →
          </button>
          <button
            aria-label="십자선 위로 이동"
            onClick={() => setValue(7, Math.max(0, values[7] - 6))}
          >
            ↑
          </button>
          <button
            aria-label="십자선 아래로 이동"
            onClick={() => setValue(7, Math.min(100, values[7] + 6))}
          >
            ↓
          </button>
        </div>
        <small>좌우 조절 나사 · 상하 조절 나사</small>
      </div>
    );
  return (
    <div className="finder-control-dock complete">
      <Check />
      <div>
        <b>파인더 정렬 완료</b>
        <p>주경과 파인더가 같은 별을 가리킵니다.</p>
      </div>
    </div>
  );
}
function ObservationStageControls({
  phase,
  setPhase,
  focus,
  setValue,
}: {
  phase: ObservationPhase;
  setPhase: (p: ObservationPhase) => void;
  focus: number;
  setValue: (i: number, v: number) => void;
}) {
  const error = Math.abs(focus - 50);
  if (phase === 'diagonal-rack' || phase === 'eyepiece-rack')
    return (
      <div className="observation-control-dock">
        <Move />
        <span>
          {phase === 'diagonal-rack'
            ? '천정미러를 포커서 뒤에 끼우세요.'
            : '25mm 접안렌즈를 위쪽 소켓에 끼우세요.'}
        </span>
      </div>
    );
  if (phase === 'diagonal-snapped')
    return (
      <div className="observation-control-dock">
        <b>천정미러 안착</b>
        <p>회전하지 않도록 측면 나사를 조이세요.</p>
        <Button onClick={() => setPhase('diagonal-locked')}>
          <RotateCw /> 고정 나사 조이기
        </Button>
      </div>
    );
  if (phase === 'diagonal-locked')
    return (
      <div className="observation-control-dock">
        <Check />
        <div>
          <b>천정미러 고정 완료</b>
          <p>저배율 접안렌즈를 준비합니다.</p>
        </div>
        <Button onClick={() => setPhase('eyepiece-rack')}>
          접안렌즈 꺼내기
        </Button>
      </div>
    );
  if (phase === 'eyepiece-snapped')
    return (
      <div className="observation-control-dock">
        <b>접안렌즈 안착</b>
        <p>작은 나사를 조여 접안렌즈를 고정하세요.</p>
        <Button onClick={() => setPhase('eyepiece-locked')}>
          <RotateCw /> 접안렌즈 고정
        </Button>
      </div>
    );
  if (phase === 'eyepiece-locked')
    return (
      <div className="observation-control-dock">
        <Check />
        <div>
          <b>광학계 조립 완료</b>
          <p>접안부를 들여다볼 준비가 됐습니다.</p>
        </div>
        <Button onClick={() => setPhase('focusing')}>
          <Eye /> 접안 시야 열기
        </Button>
      </div>
    );
  if (phase === 'focusing')
    return (
      <div className="observation-control-dock focus-control">
        <div>
          <b>
            {error < 5
              ? '정확한 초점 · 잠시 유지'
              : error < 14
                ? '거의 선명합니다'
                : '목성의 가장자리를 확인하세요'}
          </b>
          <small>초점값 {focus} · 목표 50</small>
        </div>
        <div className="focus-buttons">
          <button
            aria-label="초점 안쪽으로"
            onClick={() => setValue(8, Math.max(0, focus - 3))}
          >
            −
          </button>
          <input
            aria-label="초점 손잡이"
            type="range"
            min="0"
            max="100"
            value={focus}
            onChange={(e) => setValue(8, +e.target.value)}
          />
          <button
            aria-label="초점 바깥쪽으로"
            onClick={() => setValue(8, Math.min(100, focus + 3))}
          >
            +
          </button>
        </div>
      </div>
    );
  return (
    <div className="observation-control-dock complete">
      <Check />
      <div>
        <b>목성 초점 확보</b>
        <p>띠와 네 개의 갈릴레이 위성을 관측했습니다.</p>
      </div>
    </div>
  );
}
function ObservationSequence({ phase }: { phase: ObservationPhase }) {
  const diagonalDone =
    !phase.startsWith('diagonal') || phase === 'diagonal-locked';
  const eyepieceDone =
    phase === 'eyepiece-locked' || phase === 'focusing' || phase === 'complete';
  return (
    <div className="mini-sequence observation-sequence">
      <span className={diagonalDone ? 'done' : ''}>1 천정미러</span>
      <span className={eyepieceDone ? 'done' : ''}>2 접안렌즈</span>
      <span className={phase === 'complete' ? 'done' : ''}>3 초점</span>
    </div>
  );
}
function FocusView({ focus, complete }: { focus: number; complete: boolean }) {
  const error = Math.abs(focus - 50);
  const blur = Math.min(6, error / 6);
  const scale = 1 + Math.min(0.35, error / 110);
  return (
    <div
      className={`eyepiece-view observation-view ${complete ? 'focused' : ''}`}
    >
      <div className="view-label">
        <Eye /> EYEPIECE · 25mm
      </div>
      <div
        className="jupiter-system"
        style={{ filter: `blur(${blur}px)`, transform: `scale(${scale})` }}
      >
        <i className="moon m1" />
        <i className="moon m2" />
        <div className="jupiter">
          <i />
          <b />
        </div>
        <i className="moon m3" />
        <i className="moon m4" />
      </div>
      <small>
        {complete
          ? '초점 고정 · 목성 관측 성공'
          : error < 5
            ? '아주 선명합니다 · 그대로 유지하세요'
            : focus < 50
              ? '바깥쪽으로 조금 더 돌리세요'
              : '안쪽으로 조금 되돌리세요'}
      </small>
    </div>
  );
}
function TelescopeModel({
  stage,
  mountVisible,
  counterVisible,
  tubePhase,
  axisPhase,
  finderPhase,
  observationPhase,
}: {
  stage: number;
  counter: number;
  mountVisible: boolean;
  counterVisible: boolean;
  tubePhase: TubePhase;
  axisPhase: AxisPhase;
  finderPhase: FinderPhase;
  observationPhase: ObservationPhase;
}) {
  const observationSrc =
    observationPhase === 'diagonal-rack'
      ? '/telescope-finder-installed-v1.png'
      : observationPhase === 'diagonal-snapped' ||
          observationPhase === 'diagonal-locked' ||
          observationPhase === 'eyepiece-rack'
        ? '/telescope-diagonal-installed-v1.png'
        : '/telescope-observation-ready-v1.png';
  const src =
    stage === 1
      ? mountVisible
        ? '/telescope-stage-02-v4.png'
        : '/telescope-stage-01-v4.png'
      : stage === 2
        ? counterVisible
          ? '/telescope-stage-03-v4.png'
          : '/telescope-stage-02-v4.png'
        : stage === 3
          ? tubePhase === 'rack'
            ? '/telescope-stage-03-v4.png'
            : '/telescope-stage-04-v4.png'
          : stage === 4
            ? axisPhase === 'ra-locked'
              ? '/telescope-stage-04-v4.png'
              : axisPhase === 'ra-free'
                ? '/telescope-balance-ra-v1.png'
                : '/telescope-balance-dec-v1.png'
            : stage === 5
              ? '/telescope-observation-ready-v1.png'
              : observationSrc;
  return (
    <div
      className={`telescope-pro cohesive-rig ${stage === 3 ? `tube-${tubePhase}` : ''} ${stage === 4 ? `axis-${axisPhase}` : ''} ${stage === 5 ? `finder-${finderPhase}` : ''} ${stage === 6 ? `observation-${observationPhase}` : ''}`}
    >
      <img src={src} alt={`조립 ${stage + 1}단계의 소형 굴절망원경`} />
    </div>
  );
}
function Range({
  label,
  value,
  index,
  setValue,
}: {
  label: string;
  value: number;
  index: number;
  setValue: (i: number, v: number) => void;
}) {
  return (
    <label>
      {label}
      <output>{value}</output>
      <input
        aria-label={label}
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(index, +e.target.value)}
      />
    </label>
  );
}
function ScrewDial({
  label,
  value,
  index,
  setValue,
}: {
  label: string;
  value: number;
  index: number;
  setValue: (i: number, v: number) => void;
}) {
  return (
    <div className="screw-control">
      <button
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        onClick={() => setValue(index, Math.min(100, value + 20))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp')
            setValue(index, Math.min(100, value + 10));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown')
            setValue(index, Math.max(0, value - 10));
        }}
      >
        <span style={{ rotate: `${value * 3.2}deg` }}>
          <RotateCw />
        </span>
      </button>
      <div>
        <b>{label}</b>
        <small>
          {value >= 85 ? '단단히 고정됨' : `${value}% · 시계 방향으로 돌리기`}
        </small>
      </div>
      {value >= 85 && <Check />}
    </div>
  );
}
function Controls({
  stage,
  values,
  setValue,
  tripodPhase,
  setTripodPhase,
  mountPhase,
  counterPhase,
  setCounterPhase,
  tubePhase = 'rack',
  setTubePhase,
}: {
  stage: number;
  values: number[];
  setValue: (i: number, v: number) => void;
  tripodPhase: TripodPhase;
  setTripodPhase: (p: TripodPhase) => void;
  mountPhase: MountPhase;
  counterPhase: CounterPhase;
  setCounterPhase: (p: CounterPhase) => void;
  tubePhase?: TubePhase;
  setTubePhase?: (p: TubePhase) => void;
}) {
  if (stage === 0) {
    if (tripodPhase === 'shelf')
      return (
        <div className="drag-guide">
          <Move />
          <span>삼각대를 누른 채 설치 원까지 이동하세요.</span>
        </div>
      );
    if (tripodPhase === 'placed')
      return (
        <Button
          className="action-button"
          variant="outline"
          onClick={() => setTripodPhase('spread')}
        >
          세 다리 끝까지 펼치기
        </Button>
      );
    if (tripodPhase === 'spread')
      return (
        <Button
          className="action-button"
          variant="outline"
          onClick={() => setTripodPhase('level')}
        >
          <Eye /> 상부 수준기 들여다보기
        </Button>
      );
    return (
      <>
        <Range
          label="동쪽 다리 높이"
          value={values[0]}
          index={0}
          setValue={setValue}
        />
        <Range
          label="남쪽 다리 높이"
          value={values[9]}
          index={9}
          setValue={setValue}
        />
      </>
    );
  }
  if (stage === 1)
    return mountPhase === 'rack' ? (
      <div className="drag-guide">
        <Move />
        <span>가대를 잡아 삼각대 상판으로 이동하세요.</span>
      </div>
    ) : (
      <div className="screw-controls">
        <ScrewDial
          label="삼각대 아래 중앙나사"
          value={values[1]}
          index={1}
          setValue={setValue}
        />
        <ScrewDial
          label="가대 측면 잠금나사"
          value={values[10]}
          index={10}
          setValue={setValue}
        />
      </div>
    );
  if (stage === 2)
    return counterPhase === 'rack' ? (
      <div className="drag-guide">
        <Move />
        <span>무게추를 가대의 봉으로 이동하세요.</span>
      </div>
    ) : counterPhase === 'installed' ? (
      <Button
        className="action-button"
        variant="outline"
        onClick={() => setCounterPhase('secured')}
      >
        <RotateCw /> 고정 손잡이와 봉 끝 안전나사 잠그기
      </Button>
    ) : (
      <Button className="action-button installed" variant="outline">
        <Check /> 무게추 안전 고정 완료
      </Button>
    );
  if (stage === 3)
    return tubePhase === 'rack' ? (
      <div className="drag-guide">
        <Move />
        <span>경통을 가대 안장으로 이동하세요.</span>
      </div>
    ) : (
      <Button
        className={`action-button ${tubePhase === 'locked' ? 'installed' : ''}`}
        variant="outline"
        onClick={() => {
          setValue(3, 1);
          setTubePhase?.('locked');
        }}
      >
        {tubePhase === 'locked' ? (
          <>
            <Check /> 경통 잠금 완료
          </>
        ) : (
          '잠금 손잡이 조이기'
        )}
      </Button>
    );
  if (stage === 4)
    return (
      <div className="drag-guide">
        <CircleGauge />
        <span>망원경 옆 조작 패널에서 축 균형을 맞추세요.</span>
      </div>
    );
  if (stage === 5)
    return (
      <div className="drag-guide">
        <Eye />
        <span>파인더는 STEP 05에서 고정했습니다. 작업 화면에서 정렬을 진행하세요.</span>
      </div>
    );
  return (
    <div className="drag-guide">
      <Eye />
        <span>천정미러·접안렌즈는 STEP 05에서 고정했습니다. 접안 시야를 열고 초점을 맞추세요.</span>
    </div>
  );
}
