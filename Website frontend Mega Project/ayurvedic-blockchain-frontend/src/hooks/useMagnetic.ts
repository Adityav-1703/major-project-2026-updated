import { useMotionValue, useSpring } from 'framer-motion';
import { useEffect } from 'react';

interface UseMagneticProps {
  sensitivity?: number;
}

export const useMagnetic = ({ sensitivity = 0.2 }: UseMagneticProps = {}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const x = useSpring(mouseX, { stiffness: 170, damping: 26 });
  const y = useSpring(mouseY, { stiffness: 170, damping: 26 });

  useEffect(() => {
    const node = document.body;
    const updateMouse = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const xPercent = (e.clientX - rect.left) / rect.width - 0.5;
      const yPercent = (e.clientY - rect.top) / rect.height - 0.5;
      
      mouseX.set(xPercent * sensitivity * 100);
      mouseY.set(yPercent * sensitivity * 100);
    };

    window.addEventListener('mousemove', updateMouse);
    return () => window.removeEventListener('mousemove', updateMouse);
  }, [mouseX, mouseY, sensitivity]);

  return { x, y };
};
