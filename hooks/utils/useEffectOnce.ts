import { useEffect } from 'react';

/**
 * @description 컴포넌트가 마운트될 때 한 번만 실행되는 훅 (dep무시)
 * @param effect 실행할 함수
 * @returns void
 */
export const useEffectOnce = (effect: () => void) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};
