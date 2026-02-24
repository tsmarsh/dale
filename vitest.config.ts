import { defineConfig } from 'vitest/config';
import quickpickle from 'quickpickle';

export default defineConfig({
  plugins: [quickpickle()],
  test: {
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts', 'src/bdd/features/**/*.feature'],
    // BDD step definitions are loaded via the feature file's setupFiles override
    // Separate projects allow isolated setupFiles per test type
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          setupFiles: ['./src/test-setup.ts'],
        },
      },
      {
        plugins: [quickpickle()],
        test: {
          name: 'bdd',
          include: ['src/bdd/features/**/*.feature'],
          setupFiles: ['./src/test-setup.ts', './src/bdd/setup.ts'],
        },
      },
    ],
  },
});
