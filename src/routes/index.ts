import type { RouteObject } from 'react-router';
import { lazy } from 'react';

export const routes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({
      Component: lazy(() => import('@/pages/SoundColumns/index')),
    }),
  },
];
