// visualKey → 컴포넌트 정적 매핑.
// 동적 import 회피 — 9개 고정. tree-shake은 컴포넌트 단위로 충분.

import type { ComponentType } from 'react';
import ContextGrid from './ContextGrid';
import AutoLoop from './AutoLoop';
import ToolQuadrant from './ToolQuadrant';
import DualProcess from './DualProcess';
import CbtGrid from './CbtGrid';
import LossCas from './LossCas';
import FourStep from './FourStep';
import DeltaPain from './DeltaPain';
import ManualTemplate from './ManualTemplate';

export const VISUAL_REGISTRY: Record<string, ComponentType> = {
  'context-grid': ContextGrid,
  'auto-loop': AutoLoop,
  'tool-quadrant': ToolQuadrant,
  'dual-process': DualProcess,
  'cbt-grid': CbtGrid,
  'loss-cas': LossCas,
  'four-step': FourStep,
  'delta-pain': DeltaPain,
  'manual-template': ManualTemplate,
};
