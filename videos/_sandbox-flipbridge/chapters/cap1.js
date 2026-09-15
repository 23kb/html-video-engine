export const snapshot = 'builder-fields';

export default [
  {
    id: 'hold1',
    camera: { focus: 'body', level: 1.5, pad: 0 },
    effect: async ({ sleep }) => {
      await sleep(3000);
    },
  },
];
