import config from '../../vite.config';

// https://vite.dev/config/
export default {
  build: {
    ...config.build,
    rollupOptions: {
      ...config.build.rollupOptions,
    },
  },
};
