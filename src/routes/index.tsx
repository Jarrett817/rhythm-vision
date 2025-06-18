import type { RouteObject } from 'react-router-dom';
import BaseLayout from '@/components/BaseLayout/index';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <BaseLayout />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/pages/SoundColumns/index')).default,
        }),
      },
    ],
  },
];
